import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { platform } from 'os';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';
import type { Plugin } from 'vite';

const _require = createRequire(import.meta.url);
const isWindows = platform() === 'win32';

export interface SemiThemingOptions {
  theme?: string;
  include?: string;
  variables?: Record<string, string | number>;
  prefixCls?: string;
}

export function semiTheming({ theme, ...options }: SemiThemingOptions): Plugin {
  const include = options.include && normalizePath(options.include);
  const variables = convertMapToString(options.variables || {});

  return {
    name: 'semi-theme',
    enforce: 'post',
    async load(id) {
      const filePath = normalizePath(id);

      // https://github.com/DouyinFE/semi-design/blob/main/packages/semi-webpack/src/semi-webpack-plugin.ts#L83
      if (
        /@douyinfe\/semi-(ui|icons|foundation)\/lib\/.+\.css$/.test(filePath)
      ) {
        const scssFilePath = filePath.replace(/\.css$/, '.scss');
        const resolveCssImport = createCssImportResolver(scssFilePath);
        const { default: sass } = await import('sass');

        return sass.compileString(
          loader(readFileSync(scssFilePath, 'utf-8'), {
            ...options,
            name: theme,
            include,
            variables,
          }),
          {
            importers: [
              {
                findFileUrl(url) {
                  return resolveCssImport(url);
                },
              },
            ],
            logger: sass.Logger.silent,
          }
        ).css;
      }
    },
  };
}

export default semiTheming;

interface LoaderOptions {
  name?: string;
  prefixCls?: string;
  include?: string;
  variables?: string;
}

// copy from https://github.com/DouyinFE/semi-design/blob/main/packages/semi-webpack/src/semi-theme-loader.ts
function loader(source: string, options: LoaderOptions) {
  const theme = options.name || '@douyinfe/semi-theme-default';
  // always inject
  const scssVarStr = `@import "~${theme}/scss/index.scss";\n`;
  // inject once
  const cssVarStr = `@import "~${theme}/scss/global.scss";\n`;
  let animationStr = `@import "~${theme}/scss/animation.scss";\n`;
  let componentVariables: string | undefined;
  let fileStr = source;

  try {
    _require.resolve(`${theme}/scss/animation.scss`);
  } catch (e) {
    animationStr = ''; // fallback to empty string
  }

  try {
    componentVariables = _require.resolve(`${theme}/scss/local.scss`);
  } catch (e) {
    // ignore
  }

  if (options.include || options.variables || componentVariables) {
    let localImport = '';

    if (componentVariables) {
      localImport += `\n@import "~${theme}/scss/local.scss";`;
    }

    if (options.include) {
      localImport += `\n@import "${options.include}";`;
    }

    if (options.variables) {
      localImport += `\n${options.variables}`;
    }

    try {
      const regex =
        /(@import '.\/variables.scss';?|@import ".\/variables.scss";?)/g;
      const fileSplit = fileStr.split(regex).filter(item => Boolean(item));

      if (fileSplit.length > 1) {
        fileSplit.splice(fileSplit.length - 1, 0, localImport);
        fileStr = fileSplit.join('');
      }
    } catch (error) {
      // ignore
    }
  }

  // inject prefix
  const prefixCls = options.prefixCls || 'semi';

  const prefixClsStr = `$prefix: '${prefixCls}';\n`;

  if (source.includes('semi-base')) {
    return `${animationStr}${cssVarStr}${scssVarStr}${prefixClsStr}${fileStr}`;
  } else {
    return `${scssVarStr}${prefixClsStr}${fileStr}`;
  }
}

// copy from https://github.com/DouyinFE/semi-design/blob/main/packages/semi-webpack/src/semi-webpack-plugin.ts#L136
function convertMapToString(map: Record<string, string | number>) {
  return Object.keys(map).reduce(function (res, cur) {
    return res + `${cur}: ${map[cur]};\n`;
  }, '');
}

function normalizePath(p: string) {
  return path.posix.normalize(isWindows ? p.replace(/\\/g, '/') : p);
}

function createCssImportResolver(importer: string) {
  const _require = createRequire(importer);

  return (id: string) => {
    if (id.startsWith('~')) {
      const resolved = _require.resolve(id.substring(1));

      if (existsSync(resolved)) {
        return pathToFileURL(resolved);
      }

      return null;
    }

    const filePath = path.resolve(path.dirname(importer), id);

    if (existsSync(filePath)) {
      return pathToFileURL(filePath);
    }

    return null;
  };
}
