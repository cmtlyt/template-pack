import fs from 'node:fs';
import path from 'node:path';

const packagePath = path.resolve(__dirname, './packages');

// 创建包目录
fs.mkdirSync(packagePath, { recursive: true });

// 移动 src 文件到测试包目录下
const testPackPath = path.resolve(packagePath, './test-pack');
fs.mkdirSync(testPackPath);
fs.renameSync(path.resolve(__dirname, './src'), path.resolve(testPackPath, './src'));

// 初始化包配置文件
// 复制 LICENSE 文件
fs.copyFileSync(path.resolve(__dirname, './LICENSE'), path.resolve(testPackPath, './LICENSE'));
// 初始化 package.json 文件内容
const tempPackageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'));
tempPackageJson.name = 'test-pack';
tempPackageJson.version = '0.1.0';
tempPackageJson.description = '';
// 剔除不需要的字段
const ignoreProps = [
  'scripts.prepare',
  'scripts.ttmp',
  'scripts.lint',
  'scripts.release',
  'devDependencies',
  'lint-staged',
];
ignoreProps.forEach((prop) => {
  let _prop = tempPackageJson;
  const propPaths = prop.split('.');
  propPaths.slice(0, -1).forEach(k => (_prop = _prop[k]));
  delete _prop[propPaths.at(-1)!];
});
fs.writeFileSync(path.resolve(testPackPath, './package.json'), JSON.stringify(tempPackageJson), 'utf-8');
// 创建 readme 文件
fs.writeFileSync(path.resolve(testPackPath, './README.md'), `# ${tempPackageJson.name}\n`, 'utf-8');
// 移动 build.config.ts
fs.renameSync(path.resolve(__dirname, './build.config.ts'), path.resolve(testPackPath, './build.config.ts'));
// 移动 __test__ 目录
fs.renameSync(path.resolve(__dirname, './__test__'), path.resolve(testPackPath, './__test__'));

// 重写根目录 package.json 文件
const rootPackageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'));
// 删除转换为多包的脚本命令
delete rootPackageJson.scripts.ttmp;
rootPackageJson.scripts.stup = 'pnpm -r --filter=./packages/* --parallel run stub';
rootPackageJson.scripts.release = 'bumpp -r --execute="pnpm -r run changelog && pnpm -r --filter=./packages/* publish"';
rootPackageJson.scripts.build = 'pnpm -r --filter=./packages/* run build';
fs.writeFileSync(path.resolve(__dirname, './package.json'), JSON.stringify(rootPackageJson, null, 2), 'utf-8');
