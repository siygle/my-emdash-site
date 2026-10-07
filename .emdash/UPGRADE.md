# EmDash upgrade work order

This file is the handoff for upgrading the project at `/home/ferrari/vibe-coding/my-emdash-site` to the npm `latest` release. The updater resolved the direct packages, changed and installed them where needed, refreshed the project EmDash skills, and compared the installed core migration manifests. It did not edit application code, apply a database migration, or deploy the site.

## Package changes

- `@emdash-cms/cloudflare`: `1.1.0` → `1.2.0` (`^1.1.0` → `^1.2.0`)
- `@emdash-cms/plugin-webhook-notifier`: `0.2.2` → `0.2.3` (`^0.2.2` → `^0.2.3`)
- `emdash`: `1.1.0` → `1.2.0` (`^1.1.0` → `^1.2.0`)

## Release entries to assess

These are the complete authored major, minor, and patch entries crossed by the direct EmDash packages in this project. Changesets dependency-bump entries and attribution wrappers have been removed. Check whether each entry affects code or configuration in this project. Do not adopt an unrelated feature merely because it appears here.

### Change 1

Applies to: `@emdash-cms/cloudflare@1.2.0` (minor), `emdash@1.2.0` (minor)  
Source: [#3875](https://github.com/emdash-cms/emdash/pull/3875)

Adds a `syncName` option to external auth providers such as Cloudflare Access. By default, EmDash still replaces a user's name with the provider's name on every authenticated request, so a name edited in the admin is restored on that user's next request. Set `syncName: false` to keep names edited in the admin; the provider's name is then used only when the user is first provisioned.
  
  ```js
  auth: access({
  	teamDomain: "myteam.cloudflareaccess.com",
  	syncName: false,
  }),
  ```

### Change 2

Applies to: `@emdash-cms/cloudflare@1.2.0` (patch), `emdash@1.2.0` (patch)  
Source: [#3828](https://github.com/emdash-cms/emdash/pull/3828)

Fixes videos served from `/_emdash/api/media/file/` not playing in Safari and on iOS, and not seeking past the buffered part in other browsers. With the local, S3, and R2 storage adapters, the media route answers `Range` requests with `206 Partial Content`, or `416 Range Not Satisfiable` for a range past the end of the file, and sends `Accept-Ranges: bytes`.
  
  Custom storage adapters can serve ranges by accepting the optional `options.range` argument to `download()` and setting `range` on the result, as described in [the storage interface docs](https://docs.emdashcms.com/deployment/storage/#byte-ranges). Adapters that ignore the argument still work: range requests to them receive the whole file, or `416` for a range past the end of the file.

### Change 3

Applies to: `@emdash-cms/cloudflare@1.2.0` (patch), `emdash@1.2.0` (patch)  
Source: [#3855](https://github.com/emdash-cms/emdash/pull/3855)

Adds `ETag` and `Last-Modified` validators to media file responses and `/image` transforms, and returns `304 Not Modified` when a browser's `If-None-Match` or `If-Modified-Since` precondition matches. This lets cached mutable media (images that can be replaced under the same storage key) be revalidated with a single header exchange instead of re-downloaded on every visit. Storage backends now report `lastModified` with downloads where available (local filesystem, S3-compatible, and R2). The short `public, max-age=0, must-revalidate` cache lifetime for images is unchanged, so replacements still appear immediately.

### Change 4

Applies to: `@emdash-cms/cloudflare@1.2.0` (patch), `emdash@1.2.0` (patch)  
Source: [#3776](https://github.com/emdash-cms/emdash/pull/3776)

Fixes plugin `ctx.storage.<collection>.getMany()` and `deleteMany()` failing on D1 with `too many SQL variables` when passed more than 98 ids. Both now accept any number of ids, in trusted and sandboxed plugins alike.

### Change 5

Applies to: `@emdash-cms/cloudflare@1.2.0` (patch), `emdash@1.2.0` (patch)  
Source: [#3681](https://github.com/emdash-cms/emdash/pull/3681)

Fixes stored cross-site scripting through the editor toolbar. EmDash inserted the toolbar before the first `</body>` in a response, but Astro leaves `<` and `>` unescaped in attribute values, so content such as an image's alt text could contain `</body>` and move the toolbar inside that attribute, turning the rest of the text into live markup. The editor toolbar, and the Cloudflare preview and playground toolbars, now go only before the closing body tag of a whole HTML document, never into server island or partial page responses.
  
  Before this fix:
  
  - Unless a site set `toolbar: false`, an Author's published content could run script for any signed-in Author, Editor, or Admin who viewed it, and a Contributor's draft could do the same to a signed-in Author, Editor, or Admin who previewed it.
  - With `toolbar: "client"`, published content could also run script for every visitor.
  - In preview Workers built with `createPreviewMiddleware`, published content could run script for anyone who opened a preview link, whatever the `toolbar` setting.

### Change 6

Applies to: `@emdash-cms/plugin-webhook-notifier@0.2.3` (patch)  
Source: [#3362](https://github.com/emdash-cms/emdash/pull/3362)

Fixes the Webhook Settings page failing with `502 INVALID_BLOCK_RESPONSE` ("Plugin returned invalid Block Kit content") when the plugin runs sandboxed on EmDash 0.39. The Test Webhook button now uses `label`, and the "Enter a webhook URL first." and "Failed to save settings" banners use `title` and `variant`, as Block Kit requires. The Webhooks dashboard widget now loads: the plugin answers the `widget:status` id declared in its manifest instead of `widget:webhook-status`.

### Change 7

Applies to: `emdash@1.2.0` (minor)  
Source: [#3056](https://github.com/emdash-cms/emdash/pull/3056)

Adds an `admin.locales` option that limits the admin interface to the languages a site uses, which makes the admin bundle smaller.
  
  ```js
  emdash({
  	admin: { locales: ["en", "de"] },
  });
  ```
  
  Only the listed languages are built into the admin and offered in its language switcher. Users whose preferred languages aren't listed see English. `en` is always included as the fallback, even when the list leaves it out, so `admin: { locales: ["en-GB"] }` still ships English alongside British English. A code the admin doesn't ship fails the build, and the error lists the available codes. Sites that don't set the option keep every language.

### Change 8

Applies to: `emdash@1.2.0` (minor)  
Source: [#3877](https://github.com/emdash-cms/emdash/pull/3877)

Updates the admin user editor to show the name as read-only, with a hint to change it at the identity provider, when an external auth provider such as Cloudflare Access syncs names (the default). Previously the field looked editable, but the change was replaced on that user's next request. Set `syncName: false` in the provider config to make names editable again.

### Change 9

Applies to: `emdash@1.2.0` (minor)  
Source: [#3744](https://github.com/emdash-cms/emdash/pull/3744)

Adds a **Change domain** dialog to **Settings > General** for moving a site to a new domain. Before it changes the **Site URL**, EmDash checks that the new domain serves the site. Links in emails and plugins, sitemaps, `robots.txt`, hreflang links, social image URLs, and canonical links set in the SEO panel then use the new domain. If the check can't reach the site, for example on `localhost` or behind a login, the dialog offers to store the address without the check.
  
  The **Site URL** field becomes read-only, and saving **Settings > General** no longer writes it. When `siteUrl`, `EMDASH_SITE_URL`, or `SITE_URL` is set, the page names that address, which links in emails and plugins keep using.
  
  Passkeys only work at the address where they were created. After a move, keep signing in at the old address, or sign in at the new one with an email link and add a passkey there.

### Change 10

Applies to: `emdash@1.2.0` (minor)  
Source: [#3697](https://github.com/emdash-cms/emdash/pull/3697)

Adds a `labels` prop to the `Comments` and `CommentForm` components from `emdash/ui/comments`, so sites can translate the comment heading, member badge, Like button, form fields, submit button, and status messages. Keys you leave out keep their English defaults.
  
  `Comments` now formats comment dates in the page locale (`Astro.currentLocale`) instead of always using `en-US`, and accepts a `locale` prop to override it. Sites without Astro i18n routing still show `en-US` dates; pass `locale="en-US"` to keep the previous format on a localized site.
  
  After a successful submission, `CommentForm` now says "Comment published" when the comment is approved immediately and "Comment submitted for review" when it waits for moderation, instead of always showing "Comment submitted!".

### Change 11

Applies to: `emdash@1.2.0` (minor)  
Source: [#3744](https://github.com/emdash-cms/emdash/pull/3744)

Adds an **Email users** action to **Settings > General** that tells every other active user where the site now lives. Each user gets an email with a button to the sign-in page at the configured `siteUrl`, or the **Site URL** when none is set, and a note that passkeys from the old address don't work there. The email does not sign anyone in. The action needs an email provider, passkey sign-in, and the `users:manage` permission, and shows how many emails were sent and how many the provider rejected.
  
  The emails come from the new `POST /_emdash/api/settings/domain/notify` endpoint. It accepts signed-in sessions only and can be used 3 times per hour per site.

### Change 12

Applies to: `emdash@1.2.0` (minor)  
Source: [#3827](https://github.com/emdash-cms/emdash/pull/3827)

Adds a video block to the rich text editor. Type `/video` to choose a Media Library video or upload one. Closing the picker leaves an empty video block in place, which you can fill later by clicking it or dropping a video file on it. Video files dropped or pasted anywhere in the text also upload to the Media Library and appear where you dropped them. The video plays in the editor at the width of the text, with a caption field under it and **Replace video** and **Delete video** in its corner. A video's **Used in** tab in the Media Library lists the entries that use it in a video block.
  
  On the site, `Video` from `emdash/ui` renders the `video` block as the browser's own player with its caption. Media Library videos play from your storage's public URL when one is configured, and need the block's `asset.url`: a block without one renders nothing on the site, and the editor shows it as unplayable. A block whose `asset.provider` names a media provider renders from that provider's embed. An empty video block is saved without `asset` and renders nothing.
  
  Uploads follow `maxUploadSize`, 50 MiB by default. The admin's content security policy now allows media from `blob:` and `https:` URLs (`media-src 'self' blob: https:`), as it already did for images. This lets the admin read a video's size before uploading it, and preview a video block whose `asset.url` is on another site. Before, videos uploaded from the admin in production were saved without a width and height.
  
  #### What should I do?
  
  - If a plugin already defines a `video` block, the editor keeps using the plugin's block: it doesn't offer the built-in Video block, and dropped video files aren't uploaded. On the site, the plugin's renderer still wins; a plugin without one gets `Video` for blocks that have only the built-in fields. In TypeScript, narrowing `PortableTextBlock` on `_type === "video"` now gives `PortableTextVideoBlock | PortableTextUnknownBlock`, so reading the plugin's own fields needs a check.
  - If you edit Portable Text with `portableTextToProsemirror` and `prosemirrorToPortableText` from `emdash` in your own TipTap editor, add a `videoBlock` node with the attributes `src`, `mediaId`, `provider`, `caption`, `width` and `height` to its schema. `portableTextToProsemirror` turns every built-in video block into that node, and a schema without it can't load the document.
  - The media usage API and `emdash/client` can now return the reference type `"portable_text_video"` for a video used in a video block. Code that checks every reference type, or validates the list, needs to accept it.
  - With Astro's content security policy turned on and media on another host, allow that host in `media-src`.

### Change 13

Applies to: `emdash@1.2.0` (minor)  
Source: [#3773](https://github.com/emdash-cms/emdash/pull/3773)

Adds numbered pages to every collection list in the admin. The All and Trash tabs load one page of entries at a time, so a collection opens with 20 entries instead of fetching 100, and both tabs use the Media Library's pagination footer pinned to the bottom of the screen: the entry range, 20, 50, or 100 entries per page, and controls to jump to any page. The Trash badge counts every trashed entry instead of stopping at 50, and every trashed entry is reachable.
  
  Selections persist across pages. Changing the search, a filter, the locale, or the collection clears them.
  
  `GET /_emdash/api/content/{collection}` and `GET /_emdash/api/content/{collection}/trash` accept a 1-based `page` parameter instead of `cursor`. A numbered page returns `total` and no `nextCursor`, and sending both `page` and `cursor` returns a `400` validation error. Cursor pagination is unchanged.
  
  `ContentList` accepts optional `pagination` and `trashPagination` props for numbered pages; without them it behaves as before.

### Change 14

Applies to: `emdash@1.2.0` (minor)  
Source: [#3744](https://github.com/emdash-cms/emdash/pull/3744)

Adds a **Continue on** button to **Settings > General** after a site moves to a new domain. Passkeys only work at the address where they were created, so a user signed in at the old address can select the button to sign in at the new one without email. The single-use link expires after 5 minutes and opens **Settings > Security**, ready to add a passkey for the new address. The button appears when you are signed in at an address other than the **Site URL**, or the configured `siteUrl` when one is set. It is not shown when an external provider such as Cloudflare Access handles sign-in.
  
  The link comes from the new `POST /_emdash/api/auth/handover` endpoint, which accepts signed-in sessions only and allows 5 links per user every 5 minutes. `GET /_emdash/api/settings/domain` now also returns `siteOrigin`, the address the link points to.
  
  `@emdash-cms/auth` exports `createMagicLinkUrl()`, which creates a single-use sign-in link without sending an email.

### Change 15

Applies to: `emdash@1.2.0` (patch)  
Source: [#3781](https://github.com/emdash-cms/emdash/pull/3781)

Fixes locally stored images being served as unoptimized originals on sites that set their public origin with `EMDASH_SITE_URL` or `SITE_URL` instead of `siteUrl`, such as Node.js deployments behind an HTTPS reverse proxy. The variable must be set when `astro build` runs; a value set only in the runtime environment does not enable image optimization.

### Change 16

Applies to: `emdash@1.2.0` (patch)  
Source: [#3767](https://github.com/emdash-cms/emdash/pull/3767)

Fixes API token "Last used" dates and the cleanup of expired authentication and rate-limit records on Cloudflare Workers, where the Worker could stop before these writes finished. These writes now finish after the response is sent, and a failure is logged instead of ignored.

### Change 17

Applies to: `emdash@1.2.0` (patch)  
Source: [#3753](https://github.com/emdash-cms/emdash/pull/3753)

Fixes scheduled 404-log cleanup to run only when the table has grown past its cap. The check uses a bounded sample, so most cron ticks no longer scan the entire `_emdash_404_log` table when there is nothing to evict. This prevents the per-minute cleanup from consuming a large D1 row-read budget for tables that are below the limit.

### Change 18

Applies to: `emdash@1.2.0` (patch)  
Source: [#3762](https://github.com/emdash-cms/emdash/pull/3762)

Fixes WordPress imports turning tables in Classic editor posts into a single paragraph. Tables whose cells hold only text now import as tables, keeping their rows, header row, formatting and links. Tables with images, headings, lists or merged cells, with a caption or footer rows, or inside a `<div>` or `<figure>` keep their previous output.
  
  `gutenbergToPortableText()` also sets `hasHeaderRow: true` on tables whose first row holds only `<th>` cells.

### Change 19

Applies to: `emdash@1.2.0` (patch)  
Source: [#3802](https://github.com/emdash-cms/emdash/pull/3802)

Fixes `getEmDashCollection()` returning published content in edit mode and preview, while `getEmDashEntry()` returned the draft. Lists now show each entry's draft revision to editors in edit mode, and the draft of the previewed entry to a preview link, so inline edits made on a list page no longer appear to revert after saving and previews of list pages show the changes. Other entries in a preview, and all public requests, still get published content.

### Change 20

Applies to: `emdash@1.2.0` (patch)  
Source: [#3631](https://github.com/emdash-cms/emdash/pull/3631)

Fixes `comment:afterCreate` hooks being cut short on Cloudflare Workers. The hooks for a new comment ran as fire-and-forget work that the host did not keep alive, so they could be cancelled as soon as the response was sent. Sandboxed plugins, which call back into the host for settings and email, were stopped at their first call and never ran: a plugin that emails admins about new comments sent nothing. These hooks now run through the host's `waitUntil`, after the response, until they finish.

### Change 21

Applies to: `emdash@1.2.0` (patch)  
Source: [#3381](https://github.com/emdash-cms/emdash/pull/3381)

Fixes comment listings so a fractional `limit` no longer fails with a 500. The page size is rounded down to a whole number on the public comments endpoint, the moderation inbox, and plugin comment reads, and a non-numeric `limit` uses the default of 50.

### Change 22

Applies to: `emdash@1.2.0` (patch)  
Source: [#3785](https://github.com/emdash-cms/emdash/pull/3785)

Fixes `plugin:install` and `plugin:activate` never running for plugins registered in the `plugins` array of `astro.config.mjs`, so setup such as `ctx.cron.schedule()` in `plugin:activate` now takes effect.
  
  Each plugin's hooks run once, when the site first starts with that plugin. On existing sites, this happens on the first start after upgrading for every plugin in `plugins` that you have never enabled, disabled, or changed MCP access for in the admin. A `plugin:install` hook that is not safe to run on a site where the plugin is already in use will run then, so check your plugins before upgrading.
  
  If either hook throws, EmDash logs the error and disables the plugin instead of retrying on every start. Re-enable it from the Plugins page after fixing the problem; this runs `plugin:activate` again.

### Change 23

Applies to: `emdash@1.2.0` (patch)  
Source: [#3930](https://github.com/emdash-cms/emdash/pull/3930)

Fixes `PUT /_emdash/api/content/{collection}/{id}` so a save that carries `_rev` can no longer overwrite a change another writer saved while the request was being processed. The token was checked once against the first read of the entry, and a save that landed before the entry was read again for the write went unnoticed. The version used by the write is now checked against `_rev` as well, and a mismatch returns `409 CONFLICT`. Saves without `_rev` are unchanged.

### Change 24

Applies to: `emdash@1.2.0` (patch)  
Source: [#3911](https://github.com/emdash-cms/emdash/pull/3911)

Load `EMDASH_ENCRYPTION_KEY` from the project `.env` into `process.env` during `astro dev`. This lets freshly scaffolded Node.js sites save plugin settings declared with `type: "secret"` without first exporting the `.env` file into the shell. Existing environment variables are honored and never overwritten; other EmDash variables are not copied so that `.env` values intended for production do not override generated dev values.

### Change 25

Applies to: `emdash@1.2.0` (patch)  
Source: [#3744](https://github.com/emdash-cms/emdash/pull/3744)

Fixes email links pointing to the address a site was set up on after it moved to a new domain. Sign-in, invitation, self-signup, recovery, and comment notification emails now use the **Site URL** from **Settings > General** when `siteUrl`, `EMDASH_SITE_URL`, or `SITE_URL` is not configured, and fall back to the setup address when the field is empty. Only the origin of the **Site URL** is used, and it must use `https://` unless the host is a loopback address. A configured `siteUrl` still takes precedence. `emdash export-seed` no longer copies the **Site URL** into the seed.
  
  If you don't configure `siteUrl` and the **Site URL** field holds an address that doesn't serve this site's admin, for example an old domain, links in these emails point there after upgrading. Check the field before upgrading; clearing it restores the previous behavior. Seeds that set `settings.url`, including seeds exported by earlier versions, still fill in the **Site URL**, so remove `url` from a seed copied from another site before using it.

### Change 26

Applies to: `emdash@1.2.0` (patch)  
Source: [#3920](https://github.com/emdash-cms/emdash/pull/3920)

Fixes `emdash types` so the generated `.emdash/types.ts` imports `BylineSummary`, `ContentBylineCredit`, and `TaxonomyTerm` alongside `PortableTextBlock`.
  
  Previously the CLI downloaded TypeScript definitions whose collection interfaces referenced these three names but only imported `PortableTextBlock`, causing `tsc` to report `TS2304` errors for every collection.

### Change 27

Applies to: `emdash@1.2.0` (patch)  
Source: [#3591](https://github.com/emdash-cms/emdash/pull/3591)

Fixes the visual editor stripping superscript and subscript formatting from Portable Text fields on save, and adds superscript and subscript buttons to its formatting menu. A field that contains formatting the visual editor can't represent now shows a message instead of opening for editing, so editing on the page no longer silently removes that formatting.

### Change 28

Applies to: `emdash@1.2.0` (patch)  
Source: [#3736](https://github.com/emdash-cms/emdash/pull/3736)

Fixes the `core:recent-posts` widget so it shows each post's publication date and thumbnail. Dates use the page's locale and the site's configured timezone, falling back to UTC when the timezone setting isn't recognized. The widget doesn't apply the `dateFormat` setting; dates always use the locale's long format, such as "October 1, 2026" in English. Thumbnails render at up to 96 pixels wide instead of at full size.

### Change 29

Applies to: `emdash@1.2.0` (patch)  
Source: [#3731](https://github.com/emdash-cms/emdash/pull/3731)

Fixes `decodeSlug()` so malformed percent-escaped slugs return `undefined` instead of throwing, letting `[slug]` pages fall through to their 404 handling.

### Change 30

Applies to: `emdash@1.2.0` (patch)  
Source: [#3941](https://github.com/emdash-cms/emdash/pull/3941)

Fixes installing and updating registry plugins whose releases were attested with `actions/attest-build-provenance` v3, including releases from the workflow that `emdash-plugin release setup` generates. These installs previously failed with "release provenance could not be verified". Provenance in both GitHub formats is now accepted, and releases built on self-hosted runners are still rejected.

### Change 31

Applies to: `emdash@1.2.0` (patch)  
Source: [#3851](https://github.com/emdash-cms/emdash/pull/3851)

Adds Indonesian translations for the site domain-change flow, general settings screen, marketplace capability labels, and visual-editing toolbar strings.

### Change 32

Applies to: `emdash@1.2.0` (patch)  
Source: [#3746](https://github.com/emdash-cms/emdash/pull/3746)

Fixes in-page visual editing removing the link and alignment from Portable Text images. Saving any edit to a Portable Text field from the page no longer turns linked images into plain images or resets left, right, center, wide, and full alignment.

### Change 33

Applies to: `emdash@1.2.0` (patch)  
Source: [#3795](https://github.com/emdash-cms/emdash/pull/3795)

Fixes the content editor failing to open any entry with a date field when the site timezone setting is not a valid IANA timezone (for example `Lisboa` instead of `Europe/Lisbon`). The editor now falls back to UTC for such a value instead of crashing, and the settings API and MCP settings tool reject an unrecognized timezone with a validation error. A site that already stores one can still save its other settings, and can fix the timezone in Settings > General.

### Change 34

Applies to: `emdash@1.2.0` (patch)  
Source: [#3922](https://github.com/emdash-cms/emdash/pull/3922)

Fixes `entry.id` sometimes missing the locale prefix on multilingual sites. With several locales configured, entries in a locale whose URLs are prefixed get an `entry.id` such as `en/my-post`. With a Cloudflare database (D1, Durable Object SQL or Hyperdrive), in production and in `astro dev`, the prefix could be missing, depending on what else had already run in the same isolate, so the same entry returned `my-post` on some requests and `en/my-post` on others. Collection queries, `getEmDashEntry()` and referenced entries now always include the prefix.
  
  If your templates add the locale to links themselves, for example `/en/posts/${entry.id}`, or pass `entry.id` to `getEmDashEntry()`, use `entry.data.slug` instead, which never includes the locale.

### Change 35

Applies to: `emdash@1.2.0` (patch)  
Source: [#3914](https://github.com/emdash-cms/emdash/pull/3914)

Fixes admin media uploads skipping `media:beforeUpload` and `media:afterUpload` plugin hooks. Plugins can validate, rename, change the file type, or cancel uploads before they are accepted, and receive a notification after a new media item becomes ready. Filename and type changes are validated; the upload size stays tied to the original client bytes.

### Change 36

Applies to: `emdash@1.2.0` (patch)  
Source: [#3755](https://github.com/emdash-cms/emdash/pull/3755)

Fixes `emdash media upload --alt` and `--caption`, which reported a successful upload but saved neither value on the new media item. Direct uploads to `POST /_emdash/api/media` store the `alt` and `caption` form fields.

### Change 37

Applies to: `emdash@1.2.0` (patch)  
Source: [#3758](https://github.com/emdash-cms/emdash/pull/3758)

Fixes the admin's new-entry form ignoring field default values: a boolean field with `defaultValue: true` started switched off, and saving the entry untouched could store no value. New entries in the admin now start with each field's default value.
  
  Manifest field descriptors now include stored field defaults as `defaultValue`, except for relation-bound reference fields.

### Change 38

Applies to: `emdash@1.2.0` (patch)  
Source: [#3573](https://github.com/emdash-cms/emdash/pull/3573)

Speeds up the first anonymous page views on each new server instance, such as a fresh Cloudflare Worker isolate, when migrations run automatically: the database setup check now runs at the same time as runtime startup instead of before it.
  
  When all migrations are already applied, a temporary database error during the startup migration check (for example a lost D1 connection) no longer blocks runtime startup on that instance for 30 seconds; the next request tries again. An error while pending migrations are being applied, or a migration lock left behind by a stopped instance, still pauses retries.

### Change 39

Applies to: `emdash@1.2.0` (patch)  
Source: [#3806](https://github.com/emdash-cms/emdash/pull/3806)

Fixes collection sitemaps silently dropping entries beyond the first 50,000. Each `/sitemap-{collection}.xml` now holds up to 2,000 entries, ordered by entry ID instead of last update, and continues at `/sitemap-{collection}-2.xml`, `-3.xml`, and so on. `/sitemap.xml` lists every page with its own last-modified date, and translations that land on different pages still list each other as hreflang alternates.
  
  #### What should I do?
  
  Nothing, if search engines read `/sitemap.xml` and you have not replaced the sitemap routes. For collections with more than 2,000 listed entries:
  
  - If you submitted a collection sitemap such as `/sitemap-post.xml` directly to a search console, submit `/sitemap.xml` instead so search engines find every page.
  - If you replaced `src/pages/sitemap.xml.ts`, add `/sitemap-{collection}-{n}.xml` for each further page of 2,000 entries.
  - If you replaced `src/pages/sitemap-[collection].xml.ts`, handle the `-{n}` suffix in the `collection` parameter (for example `post-2`) and serve that page of entries.

### Change 40

Applies to: `emdash@1.2.0` (patch)  
Source: [#3546](https://github.com/emdash-cms/emdash/pull/3546)

Adds `group` to plugin admin pages, in native plugin descriptors and in `admin.pages` of `emdash-plugin.jsonc`, to place them in collapsible admin sidebar folders. A page whose group matches the group of a collection shown in the sidebar appears inside that folder, after its collections and taxonomies. Pages that share any other group, from one plugin or several, fold into one folder in the Plugins section. Pages without a group stay where they are.

### Change 41

Applies to: `emdash@1.2.0` (patch)  
Source: [#3602](https://github.com/emdash-cms/emdash/pull/3602)

Fixes trusted (in-process) plugin API routes dropping error `details`: a route that throws `PluginRouteError.badRequest(message, details)`, or whose `input` schema rejects the request, now returns those details in the JSON error body (`error.details`), so a form can show which fields failed. Unexpected errors still return only a generic message.

### Change 42

Applies to: `emdash@1.2.0` (patch)  
Source: [#3741](https://github.com/emdash-cms/emdash/pull/3741)

Fixes native plugin routes returning a generic `INTERNAL_ERROR` under `astro dev` when the handler throws `PluginRouteError`, so the client receives the error's code, status, and message.

### Change 43

Applies to: `emdash@1.2.0` (patch)  
Source: [#3744](https://github.com/emdash-cms/emdash/pull/3744)

Fixes plugins seeing an outdated site address in `ctx.site.url` and `ctx.url()`. They now use the same origin as links in emails: the configured `siteUrl`, `EMDASH_SITE_URL`, or `SITE_URL`, then the **Site URL** from **Settings > General**, then the address the site was set up on. Previously plugins only saw the setup address, even when `siteUrl` was configured or the site had moved to a new domain. A changed **Site URL** reaches plugins after the server restarts or, on Cloudflare Workers, as new isolates start.

### Change 44

Applies to: `emdash@1.2.0` (patch)  
Source: [#3931](https://github.com/emdash-cms/emdash/pull/3931)

Fixes `parseApiResponse` from `emdash/plugin-utils` rejecting with an error message that ends in a bare colon when a plugin route responds with an error page instead of an error message. The message is now the fallback message alone, without the HTTP status text, which browsers leave empty over HTTP/2 and HTTP/3.

### Change 45

Applies to: `emdash@1.2.0` (patch)  
Source: [#3574](https://github.com/emdash-cms/emdash/pull/3574)

Speeds up the first request on a fresh Cloudflare Worker isolate for sites on D1 or Durable Object SQLite: runtime startup now loads the stored plugin provider selections (such as the active comment moderator) with its other startup reads, saving one database round trip.

### Change 46

Applies to: `emdash@1.2.0` (patch)  
Source: [#3553](https://github.com/emdash-cms/emdash/pull/3553)

Stops the datetime normalization migration from printing an error-level `[datetime migration] 0 noncanonical values …` line on new sites and on upgrades with nothing to convert. When stored datetimes are rewritten, the migration still prints its report, now as an informational message.

### Change 47

Applies to: `emdash@1.2.0` (patch)  
Source: [#1899](https://github.com/emdash-cms/emdash/pull/1899)

Adds an optional `urlTemplate` prop to the `core:recent-posts` widget (e.g. `"/blog/:slug"` or `"/:slug"` for catch-all routes), using the same `:collection`, `:id`, `:slug`, and `:path` tokens as LiveSearch's `routeMap`, with a localized label in the admin widget form. Without a template the widget links exactly as before.

### Change 48

Applies to: `emdash@1.2.0` (patch)  
Source: [#3287](https://github.com/emdash-cms/emdash/pull/3287)

Fixes missing redirect hit counts and 404 log entries on Cloudflare Workers. The Worker could stop before these writes finished. It now stays alive until they complete, and a failed write is logged with a `[emdash:redirects]` prefix.

### Change 49

Applies to: `emdash@1.2.0` (patch)  
Source: [#3943](https://github.com/emdash-cms/emdash/pull/3943)

Fixes publishing and installing registry plugins attested by a GitHub Actions reusable workflow in the same repository and ref as its calling workflow. These releases previously failed with `PROVENANCE_UNVERIFIABLE` because the caller and signer were treated as the same workflow.

### Change 50

Applies to: `emdash@1.2.0` (patch)  
Source: [#3898](https://github.com/emdash-cms/emdash/pull/3898)

Fixes Astro route rules caching responses that belong to one visitor. With a cache provider such as `cacheCloudflare()`, a page rendered for a signed-in user (for example a comment form showing their name and email) could be stored and served to anonymous visitors, and a catch-all rule such as `/[...slug]` could store EmDash admin API responses or anonymous `401` responses and serve them to other users.
  
  Responses rendered for a signed-in user, and responses sent with `Cache-Control: private` or `no-store`, are no longer stored in the route cache. This includes EmDash API responses such as `/_emdash/api/search`, so route rules no longer cache them. A page requested by a signed-in user is filled into the cache by the next anonymous visitor instead.

### Change 51

Applies to: `emdash@1.2.0` (patch)  
Source: [#3559](https://github.com/emdash-cms/emdash/pull/3559)

Fixes Select All inside code blocks in the admin and inline visual editors so it selects only the code instead of the entire document.

### Change 52

Applies to: `emdash@1.2.0` (patch)  
Source: [#3861](https://github.com/emdash-cms/emdash/pull/3861)

Fixes every-minute cron ticks exceeding the Workers Free CPU limit on cold isolates by running system cleanup once per hour instead of on every tick. The scheduled-publish sweep, cron tasks, and heartbeat still run each minute; bookkeeping cleanups now run only on the top of the hour.

### Change 53

Applies to: `emdash@1.2.0` (patch)  
Source: [#3525](https://github.com/emdash-cms/emdash/pull/3525)

Fixes `emdash seed --no-content` applying the seed's content entries, bylines, and taxonomy terms anyway. The flag now skips them as documented, so combining it with `--on-conflict update` no longer overwrites existing entries.
  
  #### What should I do?
  
  If a script uses the undocumented `--noContent` spelling, switch it to `--no-content` or `--content=false`. `--noContent` was the only spelling that skipped content before this release. It is now ignored without an error, so the command applies the seed's content.

### Change 54

Applies to: `emdash@1.2.0` (patch)  
Source: [#3857](https://github.com/emdash-cms/emdash/pull/3857)

Warns when a seed file's `repeater` field has no `validation.subFields`, or declares its sub-fields under `fields` instead. Such a repeater previously seeded without any warning, and the admin then showed rows labelled "Item 1", "Item 2" with no inputs to edit. `emdash seed` prints the warning naming the field, and `validateSeed()` returns it in `warnings`; the seed still applies as before. The setup wizard does not display seed warnings.

### Change 55

Applies to: `emdash@1.2.0` (patch)  
Source: [#3672](https://github.com/emdash-cms/emdash/pull/3672)

Fixes seed validation accepting reserved collection and field slugs, such as a field named `version`. `emdash seed --validate` and the check that runs before a seed is applied now report the reserved slug, instead of the seed passing validation and then failing while it is applied.

### Change 56

Applies to: `emdash@1.2.0` (patch)  
Source: [#3578](https://github.com/emdash-cms/emdash/pull/3578)

Warns when `emdash seed` (including `--validate`) finds a widget that sets its options under `settings`. Seeding ignores that key; widget options belong in `props`.

### Change 57

Applies to: `emdash@1.2.0` (patch)  
Source: [#3754](https://github.com/emdash-cms/emdash/pull/3754)

Fixes the setup wizard staying on "Loading EmDash..." on sites whose Astro `security.csp` sets `scriptDirective.strictDynamic`. The setup page now gets the same Content-Security-Policy as the rest of the admin.

### Change 58

Applies to: `emdash@1.2.0` (patch)  
Source: [#3749](https://github.com/emdash-cms/emdash/pull/3749)

Fixes new sites created from a template keeping the template's site title and tagline instead of the ones entered in the setup wizard. Sites set up on 0.39.0 or later keep their stored values after upgrading; change them under Settings → General.

### Change 59

Applies to: `emdash@1.2.0` (patch)  
Source: [#3595](https://github.com/emdash-cms/emdash/pull/3595)

Fixes `/sitemap-{collection}.xml` returning 500 `<!-- EmDash not configured -->` for names that are not valid collection slugs, such as the `/sitemap-0.xml` that crawlers request. These now return 404.

### Change 60

Applies to: `emdash@1.2.0` (patch)  
Source: [#3750](https://github.com/emdash-cms/emdash/pull/3750)

Fixes blurry small images, such as avatars and icons, on high-density screens, and stops requesting high-density sizes larger than the original image.
  
  Media-provider images in `Image` from `emdash/ui`, Portable Text images, and galleries now get a `srcset` with the rendered width and, up to 1920 pixels, a high-density candidate: twice the rendered width, or the original width when that is smaller. Before, provider images narrower than 320 pixels had no `srcset` at all, and other provider images could list widths larger than the original. Provider images shown at their original size, as gallery images always are, now also offer that original width, even above 1920 pixels.
  
  `Image` applies the same high-density candidate to media URLs from another origin, such as a public R2 bucket.

### Change 61

Applies to: `emdash@1.2.0` (patch)  
Source: [#3889](https://github.com/emdash-cms/emdash/pull/3889)

Fixes assigning more than about 30 categories or tags to an entry on Cloudflare D1, and removing more than about 100 at once. These failed with `too many SQL variables`, whether from the admin, the content terms API, a plugin, or the WordPress import, which left such imported posts without any terms.

### Change 62

Applies to: `emdash@1.2.0` (patch)  
Source: [#3823](https://github.com/emdash-cms/emdash/pull/3823)

Fixes parameterized redirect patterns so URLs with a trailing slash match the same rule as URLs without one, consistent with exact and catch-all redirects.

### Change 63

Applies to: `emdash@1.2.0` (patch)  
Source: [#3771](https://github.com/emdash-cms/emdash/pull/3771)

Fixes the visual editing toolbar's Publish button switching to English after a save when the toolbar is shown in another language. The button now keeps its translated label, and the toolbar's status badges and image popover can be translated as well.

### Change 64

Applies to: `emdash@1.2.0` (patch)  
Source: [#3756](https://github.com/emdash-cms/emdash/pull/3756)

Fixes Publish in the visual editing toolbar publishing an older version when it is clicked while an inline Portable Text edit is still saving, which left that edit as unpublished changes. Publish now waits until every save on the page has finished.

### Change 65

Applies to: `emdash@1.2.0` (patch)  
Source: [#3894](https://github.com/emdash-cms/emdash/pull/3894)

Fixes the `WebMcpSearch` component's `search_site` tool so agents can tell a failed search from an empty one. An empty query, an HTTP error or a network failure now fails the tool call, where it previously reached the agent as a successful result. Results now arrive as a JSON array of `{ title, url, collection, excerpt }` objects, without a JSON-encoded string nested inside.

### Change 66

Applies to: `emdash@1.2.0` (patch)  
Source: [#3575](https://github.com/emdash-cms/emdash/pull/3575)

Updates `getWidgetAreas()` to return areas in creation order (previously unspecified), and removes a database round trip from logged-out page loads on Cloudflare D1.

### Change 67

Applies to: `emdash@1.2.0` (patch)  
Source: [#3896](https://github.com/emdash-cms/emdash/pull/3896)

Fixes WordPress imports leaving links to the old site's uploads in place outside image blocks. After the media import, these URLs now also point to the imported media: cover backgrounds, file blocks, self-hosted audio and video, links in text and tables (for example to a PDF), buttons, and images and links in raw HTML blocks. Content imported before this fix is not changed.

### Change 68

Applies to: `emdash@1.2.0` (patch)  
Source: [#3895](https://github.com/emdash-cms/emdash/pull/3895)

Fixes scheduled WordPress posts being imported as plain drafts. The WordPress export file (WXR) import and the WordPress plugin import in the admin now schedule them for their original publish date. Posts whose scheduled date has already passed are still imported as drafts. Posts imported before this fix are skipped on a re-import, so schedule them from the editor or delete and import them again.
  
  The WordPress plugin import also reads post dates as UTC now. On Node servers running in a time zone other than UTC, imported created and modified dates were shifted by the server's offset.

## Agent skills

The updater ran:

```sh
npx --yes skills@1.7.0 add emdash-cms/skills -y
```

Use the refreshed `upgrading-emdash` skill for this work order. If the skills command reported a conflict or failure, resolve that before continuing.

## Core database migrations

Installed EmDash changed from `1.1.0` to `1.2.0`.

No core migrations were added by this upgrade.

Build the upgraded project and inspect the exact database target:

```sh
npm run build
npm exec -- emdash migrate --status
```

If the status reports pending migrations, stop before starting or deploying the upgraded application. Follow [Backups and recovery](https://docs.emdashcms.com/guides/backups/) to create a restorable recovery point. A JSON backup is not a recovery point. After a human has reviewed the target and backup, apply the pending migrations:

```sh
npm exec -- emdash migrate
```

The command shows the target and asks for confirmation. In a non-interactive shell, add `--expected-target-fingerprint` with the target fingerprint that the status command printed for the reviewed database.

Deploy the same build artifact with the project's deployment workflow, without rebuilding it. On Cloudflare Workers, run `wrangler deploy`.

Verify the deployed database against that artifact:

```sh
npm exec -- emdash migrate --check
```

## Verification

1. Assess every release entry above and make the project changes it requires.
2. Run the project's format, tests, typecheck, and build commands.
3. Inspect the migration target and pending names before applying them.
4. Verify the public site, admin sign-in, content editing, media reads, and encrypted plugin settings after deployment.
