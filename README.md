# template-pack

一个开箱即用的 npm 的模板包, 用于快速创建 npm 包

内置了

- 测试框架 vitest
- 类型检查 typescript
- 打包工具 unbuild
- 语法检查工具 eslint
- 保存自动格式化 eslint (需要安装 vscode 的 eslint 插件)
- 包版本自动更新打标 bumpp
- 内置 github CI 工作流
- git 提交规范 commitlint

基本使用方式

- 切换为多包仓库 **(仅限单包模式可用)** `pnpm run ttmp`
- 发布 npm 包
  - 单包模式 `pnpm run release && pnpm run publish`
  - 多包模式 `pnpm run release`
- 本地测试 `pnpm run stub && pnpm run test`
- lint 检查 `pnpm run lint`
- 生成子包 **(仅限多包模式可用)** `pnpm run gsp`
- 正式打包 `pnpm run build`

commit 的时候会自动进行 stub 测试, 然后在 github actions 流程中会进行 build 测试, 所以测试文件可以直接引用 dist 目录下的内容 **(推荐这么做)**

publish 之前会自动按顺序执行: 代码 lint, 打包, 生成 changelog **(仅单包)**, 测试
