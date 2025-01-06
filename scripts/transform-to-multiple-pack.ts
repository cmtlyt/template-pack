import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const __dirname = process.cwd();

// 创建 workspace 文件
fs.writeFileSync(path.resolve(__dirname, './pnpm-workspace.yaml'), `packages:\n  - "packages/*"\n`, 'utf-8');

const packagePath = path.resolve(__dirname, './packages');

if (fs.existsSync(packagePath)) {
  fs.rmSync(packagePath, { recursive: true });
}

// 创建包目录
fs.mkdirSync(packagePath, { recursive: true });

// 移动 src 文件到测试包目录下
const demoPackPath = path.resolve(packagePath, './demo-pack');
fs.mkdirSync(demoPackPath);
fs.renameSync(path.resolve(__dirname, './src'), path.resolve(demoPackPath, './src'));

// 初始化包配置文件
// 复制 LICENSE 文件
fs.copyFileSync(path.resolve(__dirname, './LICENSE'), path.resolve(demoPackPath, './LICENSE'));
// 初始化 package.json 文件内容
const demoPackageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'));
demoPackageJson.name = 'demo-pack';
demoPackageJson.version = '0.1.0';
demoPackageJson.description = '';
// 剔除不需要的字段
const ignoreProps = [
  'scripts.prepare',
  'scripts.ttmp',
  'scripts.lint',
  'scripts.release',
  'scripts.changelog',
  'devDependencies',
  'lint-staged',
];
ignoreProps.forEach((prop) => {
  let _prop = demoPackageJson;
  const propPaths = prop.split('.');
  propPaths.slice(0, -1).forEach(k => (_prop = _prop[k]));
  delete _prop[propPaths.at(-1)!];
});
demoPackageJson.scripts.prepublishOnly = 'pnpm build && pnpm test';
fs.writeFileSync(
  path.resolve(demoPackPath, './package.json'),
  JSON.stringify(demoPackageJson, null, 2).replace(/template-pack/g, 'demo-pack'),
  'utf-8',
);
// 创建 readme 文件
fs.writeFileSync(path.resolve(demoPackPath, './README.md'), `# ${demoPackageJson.name}\n`, 'utf-8');
// 移动 build.config.ts
const buildConfig = fs.readFileSync(path.resolve(__dirname, './build.config.ts'), 'utf-8');
fs.renameSync(path.resolve(__dirname, './build.config.ts'), path.resolve(demoPackPath, './build.config.ts'));
// 移动 __test__ 目录
fs.renameSync(path.resolve(__dirname, './__test__'), path.resolve(demoPackPath, './__test__'));

// 重写根目录 package.json 文件
const rootPackageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'));
// 删除转换为多包的脚本命令
delete rootPackageJson.scripts.ttmp;
rootPackageJson.scripts.stub = 'pnpm -r --filter="./packages/*" --parallel run stub';
rootPackageJson.scripts.release = 'esno ./scripts/release.ts && pnpm -r --filter="./packages/*" publish --no-git-checks';
rootPackageJson.scripts.build = 'pnpm -r --filter="./packages/*" run build';
rootPackageJson.scripts.test = 'vitest';
rootPackageJson.scripts['test:ci'] = 'vitest run';
rootPackageJson.scripts.gsp = 'esno ./scripts/generate-sub-package.ts';
delete rootPackageJson.scripts.changelog;
delete rootPackageJson.scripts.prepublishOnly;
fs.writeFileSync(path.resolve(__dirname, './package.json'), JSON.stringify(rootPackageJson, null, 2), 'utf-8');

// 安装其余依赖
execSync('pnpm add -w -D chalk glob prompts');

// tsconfig.json 处理
const rootTsconfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, './tsconfig.json'), 'utf-8'));
// 创建 tsconfig.json 文件
const tempTsconfig = {
  extends: '../../tsconfig.json',
  compilerOptions: {
    baseUrl: '.',
    paths: rootTsconfig.compilerOptions.paths,
  },
};
fs.writeFileSync(path.resolve(demoPackPath, './tsconfig.json'), JSON.stringify(tempTsconfig, null, 2), 'utf-8');

// 重写根目录 tsconfig.json 文件
delete rootTsconfig.compilerOptions.paths;
rootTsconfig.include = ['packages/**/*.ts'];
fs.writeFileSync(path.resolve(__dirname, './tsconfig.json'), JSON.stringify(rootTsconfig, null, 2), 'utf-8');

// 生成 release 脚本
fs.writeFileSync(path.resolve(__dirname, './scripts/release.ts'), `import fs from 'node:fs';\nimport path from 'node:path';\nimport { versionBump } from 'bumpp';\nimport chalk from 'chalk';\nimport { globSync } from 'glob';\nimport prompt from 'prompts';\n\nasync function selectPackage(packages: string[]) {\n  const choices = packages.map((pkg) => {\n    const packageJson = JSON.parse(fs.readFileSync(pkg, 'utf-8'));\n    const { name, version } = packageJson;\n    return { title: \`\${name} v\${version}\`, value: { name, cwd: path.dirname(pkg), version } };\n  });\n  const { pkgs } = await prompt({ type: 'autocompleteMultiselect', name: 'pkgs', choices, message: '请选择需要更新版本的包', instructions: false });\n  return pkgs;\n}\n\nasync function patchVersion(cwd: string) {\n  await versionBump({ cwd, commit: false, tag: false, noGitCheck: true, push: false, confirm: false, files: ['package.json'] });\n}\n\n(async function run() {\n  const packages = globSync('packages/**/package.json', { absolute: true, ignore: ['**/node_modules/**'] });\n  const dumpPackages = await selectPackage(packages);\n  if (!dumpPackages || !dumpPackages.length)\n    return;\n  for (const pkgInfo of dumpPackages) {\n    const { cwd, name } = pkgInfo;\n    console.log(chalk.blue(\`--- bumpp \${name} start ---\`));\n    await patchVersion(cwd);\n    console.log(chalk.green(\`--- bumpp \${name} success ---\`));\n  }\n})();\n`, 'utf-8');

// 生成创建子包的脚本
const gsp = `import fs from 'node:fs';\nimport path from 'node:path';\nimport process from 'node:process';\n\nconst __dirname = process.cwd();\n\nfs.cpSync(path.resolve(__dirname, './template/sub-pack'), path.resolve(__dirname, './packages/sub-package'), { recursive: true });\n`;
fs.writeFileSync(path.resolve(__dirname, './scripts/generate-sub-package.ts'), gsp, 'utf-8');

// 生成子包模板
const sptPath = path.resolve(__dirname, './template/sub-pack');

// 生成测试目录和文件
const testDir = path.resolve(sptPath, './__test__');
fs.mkdirSync(testDir, { recursive: true });
fs.writeFileSync(path.resolve(testDir, './index.test.ts'), `import { describe, expect, it } from 'vitest';\n\ndescribe('demo test', () => {\n  it('should pass', () => {\n    expect(1 + 1).toBe(2);\n  });\n});\n`, 'utf-8');

// 生成 src 目录和文件
const srcDir = path.resolve(sptPath, './src');
fs.mkdirSync(srcDir, { recursive: true });
fs.writeFileSync(path.resolve(srcDir, './index.ts'), `export const name = 'sub-pack-template';\n`, 'utf-8');

// 生成 build.config.ts 文件
fs.writeFileSync(path.resolve(sptPath, './build.config.ts'), buildConfig, 'utf-8');

// 生成 LICENSE 文件
fs.writeFileSync(path.resolve(sptPath, './LICENSE'), fs.readFileSync(path.resolve(__dirname, './LICENSE'), 'utf-8'), 'utf-8');

// 生成 README.md 文件
fs.writeFileSync(path.resolve(sptPath, './README.md'), `# sub-pack-template\n\nThis is a sub-package template.\n`, 'utf-8');

// 生成 package.json 文件
fs.writeFileSync(path.resolve(sptPath, './package.json'), JSON.stringify(demoPackageJson, null, 2).replace(/(demo-pack|template-pack)/g, 'sub-package'), 'utf-8');

// 生成 tsconfig 文件
fs.writeFileSync(path.resolve(sptPath, './tsconfig.json'), JSON.stringify(tempTsconfig, null, 2), 'utf-8');
