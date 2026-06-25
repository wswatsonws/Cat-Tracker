# Money 猫砂记录原型

这是一个面向 iPhone 使用的静态网页/PWA 原型，当前数据保存在浏览器本机 `localStorage`。

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

## 本地预览

```bash
python3 -m http.server 4173
```

然后打开：

```text
http://127.0.0.1:4173/index.html
```

## 后续接 Supabase

建议下一阶段加入：

- Supabase Auth 邮箱登录
- family_spaces 家庭空间
- family_members 成员邀请
- litter_records 主记录表
- litter_box_entries 左盆/右盆详情表
- urine_clumps 尿块表
- CSV 后台导出

这样可以让两台 iPhone 共享同一份数据，并保留未来上架 App Store 的账号体系基础。
