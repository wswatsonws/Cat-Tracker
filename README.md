# Money 猫砂记录原型

这是一个面向 iPhone 使用的静态网页/PWA 原型，当前版本使用 Supabase 登录和云端保存。

## 当前功能

- 今日概览：检查次数、尿块数量、估算体积、屎块数量
- 新增记录：一次记录同时包含左盆和右盆
- 尿块记录：长、宽、高，自动计算 `长 × 宽 × 高`
- 单个尿块标记：未知、疑似 Lucky、确认 Money、确认 Lucky、排除 Money 分析
- 历史记录：按日期查看、编辑、删除
- 趋势分析：全部尿块 / 排除明显 Lucky 两种视图
- 温和提醒：基于近期个人记录对比，不做医学诊断
- 导出：CSV 和 JSON
- 导入：JSON 备份恢复
- 家庭空间：两个人登录后加入同一个家庭 ID 共享记录

## Supabase 初始化

1. 打开 Supabase 项目。
2. 进入 SQL Editor。
3. 复制 `supabase-schema.sql` 的全部内容并执行。
4. 打开网页后注册/登录。
5. 第一位用户创建家庭空间，复制家庭 ID。
6. 第二位用户登录后粘贴家庭 ID 加入。

## 本地预览

```bash
python3 -m http.server 4173
```

然后打开：

```text
http://127.0.0.1:4173/index.html
```

## GitHub Pages

当前部署地址：

```text
https://wswatsonws.github.io/Cat-Tracker/
```
