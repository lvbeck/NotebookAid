# 测试与历史记录索引

2026-10-15 整理。此页承接原首页中分散的验收指南，不作为当前下载或兼容性声明。两种语言首页见 [English](../README.md) 和 [简体中文](../README.zh-CN.md)。

当前测试包请从 [Windows Actions](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml) 和 [macOS Actions](https://github.com/lvbeck/NotebookAid/actions/workflows/macos-build.yml) 的成功运行下载。历史文档中的release路径是当时的本地交付位置，不代表文件已上传GitHub；旧版本号、验证结果及待验收状态均按其记录时间理解。

## 当前构建与验证说明

- [Windows CI 测试包](windows-ci-testing.md)：安装器、便携包、校验、当前验证边界。
- [macOS 测试包](macos-testing.md)：双架构、安装、桥接与实机待验证项目。
- [构建与支持矩阵](release-support.md)：构建依赖和更新机制。
- [实施计划](implementation-plan.md)：权威任务进度、用户批准原文摘要、交付与回退记录。
- [验收清单](acceptance.md)：按任务组织的验证步骤。

## 历史测试指南

| 范围 | 文档 |
| --- | --- |
| 初期平台与桥接 | [T02](t02-testing.md)、[T03](t03-testing.md) |
| 早期迭代 | [T03-A](t03a-testing.md)、[T03-B](t03b-testing.md)、[T03-C](t03c-testing.md)、[T04](t04-testing.md) |
| 组织、搜索、导入和兼容 | [T05](t05-testing.md)、[T05-A](t05a-testing.md) |
| 附件及后续验证 | [T06](t06-testing.md)、[T06-A](t06a-testing.md)、[T07](t07-testing.md) |
| 安全与加密 | [T08](t08-testing.md)、[批量解除加密](decrypt-testing.md) |
| 备份、恢复及笔记本外观 | [T09](t09-testing.md)、[恢复](t09-restore-testing.md)、[外观](t09-appearance-testing.md) |
| Thunderbird 与 AI | [T10](t10-testing.md)、[T11](t11-testing.md)、[T12](t12-testing.md) |
| Tasks ICS 导入 | [T13](t13-testing.md) |
| 界面与可访问性 | [T14](t14-testing.md) |
| 新手引导及菜单 | [新手引导](onboarding-testing.md)、[应用菜单](menu-testing.md)、[右键菜单](context-testing.md) |
| 启动性能及彩蛋 | [启动性能](startup-testing.md)、[彩蛋](easter-testing.md) |
| 安装及更新机制 | [T15](t15-testing.md) |

## 历史信息的处理

原README在2026-10-15前包含T03系列本地安装包链接、早期验收状态和“不交付macOS安装包”等已过时描述。本次双语首页整理不改写既有验收事实，不删除旧测试指南；完整原首页可从Git历史中的fb39e08及更早提交查看。

是否通过验收以实施计划中的真实用户决定为准；云端测试通过不等于真实账户、全部系统或正式发布已验证。T15-A资源管理器“新建”菜单集成仍按用户决定搁置。
