# yingjieliartist.com — Cloudflare Pages 部署指南

新版网站已经全部构建完成,所有静态资源(HTML / CSS / JS / 图片)都在 `site/` 目录下,可以直接部署到 Cloudflare Pages。

## 项目结构

```
yingjieli/
├── homepage.html             # 老站首页备份(参考用)
├── images/                   # 老站原始图片备份
├── DEPLOY.md                 # 本文件
└── site/                     ← 这是要部署到 Cloudflare 的目录
    ├── index.html
    ├── robots.txt
    ├── sitemap.xml
    ├── _headers              # CDN 缓存与安全头
    ├── _redirects            # 路径重定向
    ├── wrangler.toml         # CLI 部署配置
    ├── assets/
    │   ├── styles.css
    │   └── app.js
    └── images/               # 12 幅作品(已含原始高分辨率)
        └── Art1_2013.jpg ... Art12_2018.jpg
```

## 部署方式 A — 通过 Cloudflare Dashboard(最简单)

1. 登录 https://dash.cloudflare.com → **Workers & Pages** → **Create application** → **Pages** → **Upload assets**。
2. 项目名填:`yingjieliartist`。
3. 把 `site/` 目录里的 **所有文件** 拖进上传框(或者打成 zip 上传)。
4. 点 **Deploy site**,等几秒钟 Cloudflare 会给你一个 `*.pages.dev` 临时域名,先点开确认效果。
5. 进入项目 → **Custom domains** → 添加 `yingjieliartist.com` 和 `www.yingjieliartist.com`。
6. 如果你的域名 DNS 已经在 Cloudflare,会自动加上 CNAME 记录;如果不在,按提示把 DNS 转过来。

## 部署方式 B — 通过 Wrangler CLI(推荐,后续好维护)

需要 Node.js 已安装。

```bash
# 1. 安装 wrangler(全局或一次性 npx)
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 进入站点目录
cd /Users/quake0day/yingjieli/site

# 4. 首次部署(创建项目)
wrangler pages deploy . --project-name yingjieliartist

# 后续每次更新只要再跑一次同样的命令
wrangler pages deploy . --project-name yingjieliartist
```

部署完成后会输出一个 URL,例如:
```
✨ Deployment complete! Take a peek over at https://yingjieliartist.pages.dev
```

## 部署方式 C — 通过 GitHub 自动部署

1. 把 `site/` 目录 push 到一个 GitHub repo(可以让 `site/` 作为根,也可以保留当前结构)。
2. Cloudflare Dashboard → **Pages** → **Connect to Git** → 选这个 repo。
3. 构建配置:
   - **Build command**: 留空(无需构建)
   - **Build output directory**: `/`(如果整个 repo 就是 site)或 `site/`
4. 之后每次 `git push` 都会自动重新部署。

## 绑定自定义域名 yingjieliartist.com

1. 在 Cloudflare Pages 项目里 → **Custom domains** → **Set up a custom domain**。
2. 输入 `yingjieliartist.com`,Cloudflare 会检测 DNS:
   - 如果域名已托管在 Cloudflare:一键自动配 CNAME,SSL 证书自动颁发。
   - 如果还在别处:Cloudflare 会给出一个 CNAME 目标(`yingjieliartist.pages.dev`),把它配到你现在的 DNS 解析里;或者干脆把整个 `yingjieliartist.com` 搬到 Cloudflare 托管(免费,5 分钟)。
3. 同样把 `www.yingjieliartist.com` 也加上,Cloudflare 会自动从 www 重定向到根域。

## 验证清单

部署后访问 `https://yingjieliartist.pages.dev`(或绑定后的 `yingjieliartist.com`),依次确认:

- [ ] 首页加载,字体(Fraunces / Inter Tight)正确显示。
- [ ] 12 幅作品全部加载、masonry 排版正常。
- [ ] 点击作品,灯箱打开,左右键、`Esc`、移动端滑动都能用。
- [ ] 顶部导航 Biography / Works / Exhibitions / Contact 平滑滚动。
- [ ] 点 `Shop Prints` 跳转到 Etsy 商店。
- [ ] `mailto:` 邮件链接可以唤起邮件客户端。
- [ ] 移动端排版正常(Hero 单列、画廊单列)。

## 注意事项

- **图片体积**:目前 12 幅原图共约 12 MB,总下载量经过 Cloudflare 全球 CDN + Brotli 压缩没问题。如果以后想再加速,可以让 Cloudflare 开 **Polish** 或 **Image Resizing**(Pro 计划)自动转 WebP/AVIF。
- **HTTPS 与重定向**:Cloudflare Pages 默认强制 HTTPS,无需操心。
- **SEO**:已含 `robots.txt`、`sitemap.xml`、Open Graph meta 标签,以及描述性的 `<title>` 和 `<meta description>`。
- **谷歌分析**:老站用的是 GA Universal(2023-07 已停服),新站没集成;如果需要,可改用 GA4 或 Cloudflare Web Analytics(免费、隐私友好,在 Pages 项目设置里一键开启)。
- **域名过户**:如果当前域名注册商不是 Cloudflare,无需过户也能用,只要把 DNS 指过来即可;但建议把整个域名转到 Cloudflare 注册,后续管理最省事。

## 老站对比

| 项目          | 老站                              | 新站                                   |
|---------------|-----------------------------------|----------------------------------------|
| 框架          | Bootstrap 3 + jQuery + baguetteBox | 原生 HTML + CSS + 极简 JS              |
| 字体          | Lato / Droid Sans                 | Fraunces (variable) + Inter Tight      |
| 布局          | 等高 3 列网格                      | 自适应 masonry,保留作品原始比例       |
| 灯箱          | baguetteBox(第三方)              | 自研,支持键盘 / 触屏 / 预加载         |
| 配色          | 灰白 + 黑色                        | 米色纸感 + 墨色 + 古铜金口音            |
| 移动端        | 原 Bootstrap 默认                  | 专门优化的单列 + 触屏交互              |
| 首屏          | 标题 + bio                         | 编辑式 Hero + 主打作品(N°010)        |
| 加载性能      | 7 个外链(jQuery/CDN)             | 0 个 JS 依赖,单次字体请求              |
```
