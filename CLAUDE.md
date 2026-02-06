# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Next.js static blog/portfolio website** for Burak Tomakin, a Full Stack .NET Developer. It uses Next.js 13.5 with static export capabilities, Tailwind CSS for styling, and a custom markdown-based blog system.

## Commands

### Development and Build
```bash
# Start development server (also generates JSON data)
npm run dev

# Build for production
npm run build

# Export static site for hosting
npm run export

# Run ESLint
npm run lint

# Start production server
npm start
```

### Key Notes
- **Always run `npm run dev` or `npm run build` first** - these trigger the JSON generation step that converts markdown posts to JSON data
- The project is configured for GitHub Pages deployment with a `/geeky-nextjs` base path
- Static export is used (`next export`) for hosting on GitHub Pages

## Architecture

### Content Management
- **Blog posts** are stored in `/content/posts/` as markdown files with frontmatter
- **Configuration** in `/config/config.json` controls site settings, author info, and widget enablement
- **Theme system** in `/config/theme.json` provides dark/light mode color schemes and typography settings
- **JSON generation** via `lib/jsonGenerator.js` converts markdown to `.json/posts.json` at build time

### Key File Locations
- **Pages**: `/pages/` - Dynamic blog posts at `/posts/[slug]`, pagination at `/page/[pagination]`, categories at `/categories/[slug]`
- **Layouts**: `/layouts/` - Reusable layout components (Baseof, PostSingle, etc.)
- **Components**: `/layouts/components/` and `/layouts/partials/` - UI components organized by function
- **Content**: `/content/` - Markdown files for posts and static pages

### Data Flow
1. Markdown posts with frontmatter are created in `/content/posts/`
2. `lib/jsonGenerator.js` reads all posts and generates `.json/posts.json`
3. Next.js pages read from the generated JSON data
4. Posts use MDX rendering with support for React components

### Key Dependencies
- `next-mdx-remote` for MDX rendering
- `next-themes` for dark/light mode
- `gray-matter` for frontmatter parsing
- `marked` for markdown parsing
- `rehype-slug` and `remark-gfm` for MDX features

### Customization Points
- **Site metadata**: `/config/config.json` - title, author, social links, widget settings
- **Theme colors**: `/config/theme.json` - comprehensive color scheme configuration
- **Blog folder**: Controlled by `config.settings.blog_folder` (default: "posts")
- **Disqus comments**: Enable/disable in `/config/config.json`
- **Newsletter**: MailChimp integration disabled by default in `/config/config.json`

### Build Configuration
- **Base path**: Empty (`""`) - kişisel portfolyo için alt dizin yok
- **Asset prefix**: `undefined` - Next.js'in otomatik ayar yapmasına izin ver
- **Image handling**: Configured with `unoptimized: true` for static export
- **Trailing slash**: `true` - URL'lerin sonunda / olmasını sağlar
- **Admin interface**: Netlify CMS available at `/admin` route

### Önemli Notlar
- basePath ve assetPrefix boş olmalı (`""` veya `undefined`) ki dosya yolları doğru oluşsun
- Export sonrası dosya yolları `file://` değil, `/images/...` şeklinde olmalı