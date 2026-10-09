# Signal Desktop — Design Tokens (reference)

Values were extracted by reading the read-only clone at `../Signal-Desktop/`,
commit `5c1a030` (2026-10-07, v8.33.0-alpha.1). This file holds **values and wording only**. No code,
SCSS, or SVG was copied. Every value lists the file it came from (paths are relative
to `../Signal-Desktop/`).

Signal has two styling layers, and both show up on the main screens:

- **Axo tokens**, the new design system: CSS custom properties written as
  `light-dark(<light>, <dark>)`, in `ts/axo/_tailwind-theme/*.css`.
- **Legacy SCSS**: `$color-*` variables in `stylesheets/_variables.scss`, used
  by `stylesheets/_modules.scss` and `stylesheets/components/*.scss`.

When a screen uses a legacy value, this file lists that legacy value and not the Axo one.

Source abbreviations used below:

| Abbrev | File |
|---|---|
| `COLORS` | `ts/axo/_tailwind-theme/colors.css` |
| `FONTS` | `ts/axo/_tailwind-theme/fonts.css` |
| `VARS` | `stylesheets/_variables.scss` |
| `MIXINS` | `stylesheets/_mixins.scss` |
| `MODULES` | `stylesheets/_modules.scss` |
| `MSGS` | `_locales/en/messages.json` |

---

## 1. Colors

### 1.1 Legacy palette (`VARS`)

| Name | Hex | Name | Hex |
|---|---|---|---|
| white | `#ffffff` | gray-62 | `#545454` |
| gray-02 | `#f6f6f6` | gray-65 | `#4a4a4a` |
| gray-04 | `#f0f0f0` | gray-75 | `#3b3b3b` |
| gray-05 | `#e9e9e9` | gray-78 | `#343434` |
| gray-15 | `#dedede` | gray-80 | `#2e2e2e` |
| gray-20 | `#c6c6c6` | gray-85 | `#262626` |
| gray-25 | `#b9b9b9` | gray-90 | `#1b1b1b` |
| gray-40 | `#808080` | gray-95 | `#121212` |
| gray-45 | `#848484` | black | `#000000` |
| gray-60 | `#5e5e5e` | | |

Accents (`VARS`):

| Name | Value | Notes |
|---|---|---|
| ultramarine | `#2c6bed` | Same as `accent-blue`. Primary brand blue in legacy styles. |
| ultramarine-light | `#6191f3` | Dark-theme variant used for links and focus |
| ultramarine-dark | `#1851b4` | |
| ultramarine-dawn | `#406ec9` | |
| ultramarine-pastel / pale | `#abc4f8` / `#d2dffb` | |
| ultramarine-logo | `#3b45fd` | Same as Axo `brand-primary` |
| link | `#315ff4` | |
| accent-green / red / yellow | `#4caf50` / `#f44336` / `#ffd624` | Red is used for the send-error icon |
| selected-message bg (light) | `rgba(44,107,237,0.24)` | Focus-visible on a message |
| selected-message bg (dark) | gray-65 `#4a4a4a` | |

### 1.2 Axo semantic tokens (`COLORS`): light / dark

These are the default (normal-contrast) values. A `prefers-contrast: more` override
also exists in the same file.

**Labels (text and icons)**

| Token | Light | Dark |
|---|---|---|
| label-primary | `#000` @ 90% | `#fff` @ 90% |
| label-secondary | `#000` @ 60% | `#fff` @ 60% |
| label-placeholder | `#000` @ 35% | `#fff` @ 35% |
| label-disabled | `#000` @ 25% | `#fff` @ 25% |
| label-primary-oncolor | `#ffffff` | `#fff` @ 90% |
| label-secondary-oncolor | `#fff` @ 80% | `#fff` @ 70% |
| label-accent | `#030ffc` | `#99a1ff` |
| label-affirmative | `#00a015` | `#30d150` |
| label-destructive | `#f21602` | `#ff4a3a` |
| label-warning | `#332900` | `#ffde5b` |

**Surfaces**

| Token | Light | Dark |
|---|---|---|
| surface-primary | `#fafafa` | `#191919` |
| surface-secondary | `#f5f5f5` | `#1e1e1e` |
| surface-tertiary | `#f0f0f0` | `#282828` |
| surface-quaternary | `#e6e6e6` | `#373737` |
| surface-card | `#ffffff` | `#969696` @ 8% |
| surface-message-incoming | `#ebebeb` | `#323232` |
| surface-message-outgoing | `#2267f5` | `#2267f5` |

**Fills (hover, pressed, buttons)**

| Token | Light | Dark |
|---|---|---|
| fill-primary (hover) | `#7d7d7d` @ 8% | `#969696` @ 12% |
| fill-primary-pressed (selected) | `#7d7d7d` @ 12% | `#969696` @ 16% |
| fill-secondary | `#7d7d7d` @ 16% | `#969696` @ 20% |
| fill-accent | `#4655ff` | `#5563ff` |
| fill-accent-pressed | `#3b4af4` | `#616eff` |
| fill-destructive | `#f21c0d` | `#ee382c` |
| fill-overlay (modal backdrop) | `#000` @ 24% | `#000` @ 48% |

**Borders**

| Token | Light | Dark |
|---|---|---|
| border-primary | `#000` @ 6% | `#fff` @ 6% |
| border-secondary | `#000` @ 12% | `#fff` @ 12% |
| border-selected | `#4655ff` | `#c9ceff` |

**Legacy Axo aliases** (`COLORS`, "Legacy Colors" section)

| Token | Light | Dark |
|---|---|---|
| legacy-conversation-header-bg | `#fff` | `#121212` |

### 1.3 Where each color is used on the main screens

| Area | Light | Dark | Source |
|---|---|---|---|
| Nav rail (tab strip) background | surface-secondary `#f5f5f5` | `#1e1e1e` | `stylesheets/components/NavTabs.scss` |
| Nav rail right border | border-primary | border-primary | same |
| Left pane (chat list) background | surface-secondary `#f5f5f5` | `#1e1e1e` | `stylesheets/components/NavSidebar.scss` |
| Conversation / timeline background | `#ffffff` | gray-95 `#121212` | `stylesheets/_conversation.scss` (`.conversation`) |
| Conversation header background | `#fff` | `#121212` | `COLORS` legacy-conversation-header-bg |
| Chat row hover | fill-primary | fill-primary | `MODULES` `.module-conversation-list__item--contact-or-conversation` |
| Chat row selected | fill-primary-pressed | fill-primary-pressed | same |
| Chat row name | gray-90 `#1b1b1b` | gray-05 `#e9e9e9` | same |
| Chat row preview and date | gray-60 `#5e5e5e` | gray-25 `#b9b9b9` | same |
| Unread badge | fill-accent `#4655ff` bg, white text | `#5563ff` | same |
| Mute icon in row | gray-45 `#848484` | gray-25 | same |
| Search input background | fill-primary | fill-primary | `stylesheets/components/SearchInput.scss` |
| Composer input background | surface-message-incoming `#ebebeb` | `#323232` | `stylesheets/components/CompositionInput.scss` |
| Composer placeholder | gray-45 `#848484` | gray-25 `#b9b9b9` | same |
| Composer focus border | ultramarine `#2c6bed` | ultramarine | same |
| "Unread messages" divider line | gray-45 | gray-45 | `MODULES` `.module-last-seen-indicator__bar` |
| "Unread messages" divider text | gray-90 | gray-05 | `MODULES` `.module-last-seen-indicator__text` |

### 1.4 Message bubble colors

| Bubble | Light | Dark | Source |
|---|---|---|---|
| Outgoing (default color "ultramarine") | `linear-gradient(180deg, #0552f0, #2c6bed)` with `background-attachment: fixed` | same | `VARS` `$color-ultramarine-gradient`; `ts/types/Colors.std.ts` `DEFAULT_CONVERSATION_COLOR = 'ultramarine'`; `MODULES` `.module-message__container--outgoing-*` |
| Outgoing fallback (no conversation color class) | `#2267f5` | `#2267f5` | `MODULES` `.module-message__container--outgoing` + `COLORS` |
| Outgoing text | `#fff` @ 90% | `#fff` @ 90% | `MODULES` `.module-message__text` |
| Incoming bubble | `#ebebeb` | `#323232` | `COLORS` surface-message-incoming |
| Incoming text | gray-90 `#1b1b1b` | gray-05 `#e9e9e9` | `MODULES` `.module-message__text--incoming` |
| Metadata (time + status), outgoing | `#fff` @ 80% | `#fff` @ 70% | `MODULES` `.module-message__metadata--outgoing` (label-secondary-oncolor) |
| Metadata, incoming | `#000` @ 60% | `#fff` @ 60% | `MODULES` `.module-message__metadata` (label-secondary) |

`background-attachment: fixed` makes the gradient span the whole viewport, so bubbles
near the top of the window look darker than bubbles near the bottom.

### 1.5 Default avatar colors (`VARS` `$avatar-color-*`)

Initials avatars use a pastel background with a saturated foreground (initials text).

| Key | bg | fg | Key | bg | fg |
|---|---|---|---|---|---|
| A100 | `#e3e3fe` | `#3838f5` | A160 | `#f6d8ec` | `#b8057c` |
| A110 | `#dde7fc` | `#1251d3` | A170 | `#f5d7d7` | `#be0404` |
| A120 | `#d8e8f0` | `#086da0` | A180 | `#fef5d0` | `#836b01` |
| A130 | `#cde4cd` | `#067906` | A190 | `#eae6d5` | `#7d6f40` |
| A140 | `#eae0fd` | `#661aff` | A200 | `#d2d2dc` | `#4f4f6d` |
| A150 | `#f5e3fe` | `#9f00f0` | A210 | `#d7d7d9` | `#5c5c5c` |

Initials font size = `ceil(avatarSize × 0.45)` (`ts/components/Avatar.dom.tsx`).

---

## 2. Typography

### 2.1 Font family (`VARS` `$inter`, `FONTS` `--font-sans`)

```
Inter, 'Source Sans Pro', 'Source Han Sans', -apple-system, system-ui,
'Segoe UI', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif
```

(Signal also lists its own bundled emoji fonts. We drop those.) Signal bundles Inter v3.19 in
the weights Regular 400, Medium 500, SemiBold 600, Bold, and italics
(`stylesheets/_fontfaces.scss`). Inter is available from Google Fonts.

### 2.2 Legacy type mixins (`MIXINS`), used by the main screens

| Mixin | Size | Line height | Letter spacing | Weight |
|---|---|---|---|---|
| title-1 | 26px | 32px | -0.56px | 600 |
| title-2 | 20px | 26px | -0.34px | 600 |
| title-medium | 18px | 25px | -0.25px | 600 |
| body-1 | 14px | 20px | -0.08px | 400 (bold = 600) |
| body-2 | 13px | 18px | -0.03px | 400 (bold = 600, medium = 500) |
| body-small / subtitle | 12px | 16px | 0 | 400 (bold = 600) |
| caption | 11px | 14px | 0.06px | 400 (bold = 600) |

### 2.3 Axo type presets (`FONTS`)

| Preset | Size | Line height | Tracking | Weight |
|---|---|---|---|---|
| title-large | 24px | 32px | -0.019em | 600 |
| title-medium | 18px | 24px | -0.014em | 600 |
| title-small | 14px | 20px | -0.006em | 600 |
| body-large | 14px | 20px | -0.006em | 400 |
| body-medium | 13px | 18px | -0.003em | 400 |
| body-small | 12px | 16px | 0 | 400 |
| caption | 11px | 14px | 0.005em | 400 |

### 2.4 Which style each element uses

| Element | Style | Source |
|---|---|---|
| Message text | body-1 (14/20) | `MODULES` `.module-message__text` |
| Sender name in group bubble | body-small-bold (12/16, 600) | `MODULES` `.module-message__author` |
| Message time + status | caption (11/14) | `MODULES` `.module-message__metadata` |
| Chat row name | body-1-bold (14/20, 600) | `MODULES` conversation list `__header__name` |
| Chat row preview | body-2 (13/18), up to 2 lines | `MODULES` `__message__text` |
| Chat row date | caption (11/14) | `MODULES` `__header__date` |
| Unread count badge | caption-bold, weight 500 | `MODULES` `__unread-indicator` |
| Left pane title ("Chats") | title-medium, line-height 20px | `stylesheets/components/NavSidebar.scss` `.NavSidebar__HeaderTitle` |
| Conversation header name | body-1-bold | `stylesheets/components/ConversationHeader.scss` |
| Conversation header subtitle | body-2, gray-60 / gray-25 | same |
| Composer input | body-1 | `stylesheets/components/CompositionInput.scss` |
| Search input | body-2 | `stylesheets/components/SearchInput.scss` |
| Empty-state title / subtitle | title-medium / body, label-secondary | `stylesheets/components/NavSidebar.scss` `.NavSidebarEmpty__*` |
| "Unread messages" divider text | body-2-bold | `MODULES` `.module-last-seen-indicator__text` |

---

## 3. Message bubble geometry (`MODULES` `.module-message__container*`)

| Property | Value |
|---|---|
| Border radius | **18px** |
| Radius of the corner next to a grouped neighbor | **4px**. Applies on the sender's side only: top-start/bottom-start for incoming, top-end/bottom-end for outgoing. |
| Padding | **8px** vertical, **12px** horizontal |
| Vertical margin | 6px top and bottom. Drops to **1px** on the side touching a grouped neighbor (`--collapsed-above/below`). |
| Max width (default/narrow timeline) | `min(306px, 100% − 38px)` |
| Max width (medium timeline) | **370px** |
| Max width (wide timeline) | **50vw** |
| Emoji-only message | padding-top 4px; no bubble background |
| Metadata row | flex, right-aligned, margin-top 3px, `white-space: nowrap` |
| Author line (groups) | margin-bottom 3px, ellipsis |
| Send-error icon | 20×20, red `#f44336`, outside the bubble on the start side (container min-width 28px) |
| Selected (select mode) | row background ultramarine @ 8% |
| Typing indicator dots | 3 dots, each 6×6, circle; container 38×8 (30px wide inside a bubble) |

Grouping rule (inferred from the class names): consecutive messages from the same sender
are "collapsed". Signal shrinks the touching corners to 4px and the gap between the bubbles to 1px + 1px.

---

## 4. Conversation list (left pane) dimensions

| Property | Value | Source |
|---|---|---|
| Nav rail width | **80px** | `VARS` `$NavTabs__width` |
| Nav rail icon size | 20px; button radius 8px; item padding 2px block / 10px inline; button padding 10px block | `stylesheets/components/NavTabs.scss`, `VARS` |
| Nav unread badge | 16px tall, min-width 16px, 10px text, label-destructive bg | `NavTabs.scss` |
| Left pane width | default **320px**; resizable 97–380px; snaps to narrow (avatars only) below 280px | `ts/state/selectors/items.dom.ts`, `ts/util/leftPaneWidth.std.ts` |
| List side padding | 11px start/end | `MODULES` `.module-conversation-list` |
| **Row height** | **72px** | `MODULES` `$normal-row-height` |
| Row padding | **8px** block, **14px** inline | `MODULES` `--contact-or-conversation` |
| Row margin | 2px block | same |
| Row radius | **10px** | same |
| Avatar size | **48px** | `ts/components/conversationList/BaseConversationListItem.dom.tsx` (`AvatarSize.FORTY_EIGHT`) |
| Avatar → text gap | 12px | `MODULES` `__content` margin-inline-start |
| Name/date gap | date margin-inline-start 6px | `MODULES` `__header__date` |
| Mute icon | 14px, 8px left gap | `MODULES` `__mute-icon` |
| Preview lines | up to 2 (`-webkit-line-clamp: 2`) | `MODULES` `__message__text` |
| Unread badge | 18px tall, min-width 18px, radius 10px, padding-inline 4px, 10px gap before it | `MODULES` `__unread-indicator(s)` |
| Status icon in row | 12×12 (18 wide for delivered/read), margin-top 4px, 6px start gap | `MODULES` `__message__text__status-icon` |
| Section header row (e.g. "Pinned") | 40px | `ts/components/ConversationList.dom.tsx` `HEADER_ROW_HEIGHT` |
| Archive button row | 72px, radius 10px | `MODULES` `--archive-button` |
| Search input | 28px tall, radius 8px, padding-inline 30px (icon space) / 5px | `stylesheets/components/SearchInput.scss` |
| Left pane header | padding-block 15px; icon buttons 20×20 | `MODULES` `.module-left-pane__header` |

### Conversation header and composer

| Property | Value | Source |
|---|---|---|
| Conversation header height | **52px** (+ title-bar drag area) | `VARS` `$header-height`, `ConversationHeader.scss` |
| Header avatar | 32px min-width, 12px gap to the name | `ConversationHeader.scss` |
| Composer area | min-height 42px, padding-block 10px | `stylesheets/components/CompositionArea.scss` |
| Composer input | radius **18px**; height 32px min, 72px max before it scrolls; inner padding-inline 12px, padding-block 6px | `CompositionInput.scss` |
| Composer button cells | margin-inline 4px (12px at the outer edges) | `CompositionArea.scss` |

---

## 5. Message status icon states

Sources: `MODULES` `.module-message__metadata__status-icon*` (in the bubble) and
`.module-conversation-list__item--contact-or-conversation__content__message__text__status-icon*`
(in the chat row). The icons are SVGs in `images/icons/v3/message_status/`. They are
described below in words only. **Redraw them; do not copy the files.**

| State | Shape (described, not copied) | Size | Color in bubble | Color in chat row (light / dark) | Motion |
|---|---|---|---|---|---|
| **sending** (also **paused**) | Circle of short dashes (a dotted ring) | 12×12 | `currentColor`, which follows the metadata color | gray-60 / gray-45 | Rotates 360° every **4s**, linear, infinite. Only while the page is visible. |
| **sent** | One outlined circle, 12px wide with a ~1.1px stroke, holding one checkmark | 12×12 | currentColor | gray-45 / gray-25 | none |
| **delivered** | **Two overlapping outlined circles**, side by side (the left one partly hidden behind the right). Checkmarks in both. | **18×12** | currentColor | gray-45 / gray-25 | none |
| **read** (also **viewed**) | **Two overlapping solid (filled) circles**. The checkmarks are knocked out of the fill. | **18×12** | currentColor | gray-45 / gray-25 | none |
| **error** / **partial-sent** | Filled circle with "!" (error-circle icon) | 12×12 in row; 20×20 beside the bubble | red `#f44336` | red `#f44336` | none |
| **paused** (row) | Same error-circle | 12×12 | — | gray-60 / gray-45 | none |

Layout notes (`MODULES`):

- The icon sits **after** the timestamp, with `margin-inline: 6px` and margin-bottom 2px.
- Delivered and read are 18px wide but set `margin-inline-end: 0`. That keeps the row's total width the same as sent's 12px icon plus its 6px margin.
- Read differs from delivered by **fill**, not color. Delivered is outlined, read is solid. Signal has no blue checks.
- On an image with no caption, the icon is white (light theme) or gray-02 (dark theme) over the image
  (`.module-message__metadata__status-icon--with-image-no-caption`).

Related strings are in §6.6.

---

## 6. English UI strings (`MSGS`)

The key is shown in `code`; the string follows it. `{x}` marks an ICU placeholder. Curly apostrophes (’) and
ellipses (…) are kept as in the source.

### 6.1 Navigation tabs / left pane

| Key | String |
|---|---|
| `icu:NavTabs__ItemLabel--Chats` | Chats |
| `icu:NavTabs__ItemLabel--Calls` | Calls |
| `icu:NavTabs__ItemLabel--Stories` | Stories |
| `icu:NavTabs__ItemLabel--Settings` | Settings |
| `icu:NavTabs__ItemIconLabel--UnreadCount` | {count} unread |
| `icu:NavTabsToggle__hideTabs` / `__showTabs` | Hide Tabs / Show Tabs |
| `icu:LeftPane--chats` | Chats |
| `icu:LeftPane--pinned` | Pinned |
| `icu:newConversation` | New chat |
| `icu:search` | Search |
| `icu:searchUnreadChats` | Search unread chats |
| `icu:archivedConversations` | Archived Chats |
| `icu:avatarMenuViewArchive` | View Archive |
| `icu:archiveHelperText` | These chats are archived and will only appear in the Inbox if new messages are received. |
| `icu:backToInbox` | Back to inbox |
| `icu:NavSidebar__BackButtonLabel` | Back |
| `icu:emptyInbox__title` | No chats |
| `icu:emptyInbox__subtitle` | Recent chats will appear here. |
| `icu:noConversationsFound` | No chats found |
| `icu:noSearchResults` | No results for "{searchTerm}" |
| `icu:noSearchResultsInConversation` | No results for "{searchTerm}" in {conversationName} |
| `icu:contactsHeader` / `icu:groupsHeader` / `icu:messagesHeader` | Contacts / Groups / Messages |
| `icu:mainMenuSettings` | Preferences… |

### 6.2 Chat list row and its context menu

| Key | String |
|---|---|
| `icu:ConversationListItem--draft-prefix` | Draft: |
| `icu:ConversationListItem--message-request` | Message Request |
| `icu:ConversationListItem--blocked` | Blocked |
| `icu:noteToSelf` | Note to Self |
| `icu:pinConversation` / `icu:unpinConversation` | Pin chat / Unpin chat |
| `icu:markUnread` / `icu:markRead` | Mark as unread / Mark read |
| `icu:muteNotificationsTitle` | Mute notifications |
| `icu:archiveConversation` / `icu:moveConversationToInbox` | Archive / Unarchive |
| `icu:deleteConversation` | Delete |
| `icu:ConversationList__aria-label` | Chat with {title}, {unreadCount, plural, one {# new message} other {# new messages}}, last message: {lastMessage}. |

### 6.3 Timestamps

| Key | String |
|---|---|
| `icu:justNow` | Now |
| `icu:minutesAgo` | {minutes}m |
| `icu:hoursAgo` | {hours}h |
| `icu:today` / `icu:yesterday` | Today / Yesterday |
| `icu:timestampFormat__long--today` | Today {time} |
| `icu:timestampFormat__long--yesterday` | Yesterday {time} |
| `icu:unreadMessages` | {count, plural, one {# Unread Message} other {# Unread Messages}} |

### 6.4 Conversation header

| Key | String |
|---|---|
| `icu:makeOutgoingVideoCall` | Start a video call |
| `icu:makeOutgoingCall` | Start a call |
| `icu:joinOngoingCall` | Join |
| `icu:searchIn` | Search chat |
| `icu:showConversationDetails--direct` / `icu:showConversationDetails` | Chat settings / Group settings |
| `icu:disappearingMessages` | Disappearing messages |
| `icu:ConversationHeader__menu__selectMessages` | Select messages |
| `icu:showMembers` | Show members |
| `icu:allMediaMenuItem` | All media |
| `icu:mute` / `icu:unmute` | Mute / Unmute |
| `icu:ConversationHeader__MenuItem--DeleteChat` | Delete Chat |
| `icu:ConversationHeader__MenuItem--Block` / `--Unblock` | Block / Unblock |
| `icu:ConversationHeader__DeleteConversationConfirmation__title` | Delete chat? |
| `icu:ConversationHeader__DeleteConversationConfirmation__description-with-sync` | All messages in this chat will be deleted from all your devices. |
| `icu:ConversationHeader__ContextMenu__LeaveGroupAction__title` | Leave group |

### 6.5 Composer

| Key | String |
|---|---|
| `icu:sendMessage` | Message *(composer placeholder)* |
| `icu:CompositionArea--attach-plus` | Add attachment or poll |
| `icu:CompositionArea__AttachMenu__PhotosAndVideos` | Photos & videos |
| `icu:CompositionArea__AttachMenu__File` | File |
| `icu:CompositionArea--expand` | Expand |
| `icu:CompositionInput__editing-message` | Edit message |
| `icu:CompositionArea__edit-action--discard` | Discard message |
| `icu:CompositionArea__edit-action--send` | Send edited message |

### 6.6 Messages: status, metadata, actions

| Key | String |
|---|---|
| `icu:sent` | Sent |
| `icu:received` | Received |
| `icu:sendFailed` | Send failed |
| `icu:sendPaused` | Send paused |
| `icu:partiallySent` | Partially sent, click for details |
| `icu:MessageDetailsHeader--Pending` | Pending |
| `icu:MessageDetailsHeader--Sent` | Sent to |
| `icu:MessageDetailsHeader--Delivered` | Delivered to |
| `icu:MessageDetailsHeader--Read` | Read by |
| `icu:MessageDetailsHeader--Viewed` | Viewed by |
| `icu:MessageDetailsHeader--Failed` | Not sent |
| `icu:from` | From |
| `icu:MessageMetadata__edited` | Edited |
| `icu:MessageMetadata__pinned` | Pinned |
| `icu:messageAccessibilityLabel--outgoing` | Message sent by you |
| `icu:messageAccessibilityLabel--incoming` | Message sent by {author} |
| `icu:message--deletedForEveryone--outgoing` | You deleted this message |
| `icu:message--deletedForEveryone--incoming` | {name} deleted this message |
| `icu:typingAlt` | Typing animation for this chat |
| `icu:messageContextMenuButton` | More actions |
| `icu:MessageContextMenu__reply` | Reply |
| `icu:MessageContextMenu__react` | React |
| `icu:MessageContextMenu__forward` | Forward |
| `icu:MessageContextMenu__info` | Info |
| `icu:MessageContextMenu__select` | Select |
| `icu:MessageContextMenu__deleteMessage` | Delete |
| `icu:copy` | Copy text |
| `icu:retrySend` | Retry Send |
| `icu:moreInfo` | More Info |

Signal has no "Delivered"/"Read" label next to a bubble. Status in a bubble is shown by
the icon alone. The words above appear only in the message **Info** (detail) view.

### 6.7 Delete-message modal

| Key | String |
|---|---|
| `icu:DeleteMessagesModal--title-2` | Delete selected {count, plural, one {message} other {# messages}}? |
| `icu:DeleteMessagesModal--description` | Who would you like to delete {count, plural, one {this message} other {these messages}} for? |
| `icu:DeleteMessagesModal--deleteForMe` | Delete for me |
| `icu:DeleteMessagesModal--deleteForEveryone` | Delete for everyone |
| `icu:cancel` / `icu:ok` / `icu:delete` | Cancel / OK / Delete |

### 6.8 New chat (compose) screen

| Key | String |
|---|---|
| `icu:contactSearchPlaceholder` | Name, username, or number |
| `icu:findByUsernameHeader` | Find by username |
| `icu:findByPhoneNumberHeader` | Find by phone number |
| `icu:chooseGroupMembers__title` | Choose members |
| `icu:chooseGroupMembers__next` / `__skip` | Next / Skip |
| `icu:sendMessageToContact` | Send Message |

### 6.9 Welcome / empty main panel and placeholder tabs

| Key | String |
|---|---|
| `icu:welcomeToSignal` | Welcome to Signal |
| `icu:signalNonProfit` | Signal is a 501c3 nonprofit |
| `icu:CallsTab__HeaderTitle--CallsList` | Calls |
| `icu:CallsTab__NewCallActionLabel` | New Call |
| `icu:Stories__title` | Stories |
| `icu:Stories__list-empty` | No recent stories to show right now |
| `icu:themeLight` / `icu:themeDark` / `icu:themeSystem` | Light / Dark / System |
| `icu:Preferences--theme` | Theme |

## Limits (non-visual)
- Group name max length: 32 characters. Source: Signal-Desktop `ts/components/GroupTitleInput.dom.tsx` (`maxLengthCount={32}`).
- Typing indicator, sender: send "started" on first keystroke, re-send every 10 s while typing continues, send "stopped" after 3 s with no keystroke. Source: Signal-Desktop `ts/models/conversations.preload.ts` (`setTypingRefreshTimer` 10*1000, `setTypingPauseTimer` 3*1000).
- Typing indicator, receiver: hide after 15 s without a refresh; tracked per sender *device*. Source: same file, `contactTypingTimers` (15*1000, key `${sender.id}.${senderDevice}`).

---

## 7. Onboarding, app shell, compose (added Phase 4)

### 7.1 Registration card (`ts/components/standaloneRegistration/StandaloneRegistration.dom.tsx`, `.../util/StepComponents.dom.tsx`, `stylesheets/components/standaloneRegistration/StandaloneRegistration.scss`)
Axo spacing unit = 4px (Tailwind scale), checked against the screenshot (card 572px wide).

| Property | Value |
|---|---|
| Page background | a bitmap (`images/registration-background.png`, NOT copied). We use a soft CSS gradient instead. |
| Signal logo | absolute, inset-inline-start 32px, top 64px, height 32px (top 32px / height 16px when the window is ≤800px tall and ≤900px wide) |
| Card | centered, width **572px**, max-width calc(100% − 32px), max-height calc(100% − 32px), radius **26px**, bg surface-primary, padding **24px** |
| Step body | min-height 352px, centered column, text-align center |
| Title | title-medium (18/24, 600), margin-bottom 8px |
| Description | body-large (14/20), label-secondary, width 362px |
| Phone input width | 324px; profile name inputs 400px |
| Primary button (Continue) | pill, padding 6px 12px, min-width 56px, body-medium 13px weight 500, bg fill-accent, text white; disabled text = white @ 35% (`label-disabled-oncolor`) |
| Secondary button (Add photo) | same size, bg fill-secondary, label-primary text |
| Text link buttons (Resend code, Call me) | label-accent text, no background |
| Profile avatar preview | 80×80 |
| OTP boxes | 6 boxes, 32px content + 10px padding, radius 12px, border 0.5px border-primary, shadow elevation-0, 10px gap, **24px gap after the 3rd** |
| Spacers (phone step) | 52px above the title, 36px above the input |
| Spacers (code step) | 80px above the title, 32px above the boxes, 72px below |

### 7.2 Text field (`ts/axo/fields/_AxoBaseField.css`, `ts/axo/_tailwind-theme/focus-rings.css`, `colors.css`, `shadows.css`)
| Property | Value |
|---|---|
| Background | fill-control: `#ffffff` / `#969696` @ 12% |
| Border | 0.5px border-primary + shadow `0 1px 2px 0 rgba(0,0,0,.08)` |
| Radius | `curved-lg` = 8px × 1.15 ≈ **9px** |
| Text | body-large (14/20), padding-block 6px, padding-inline 10px |
| Focus ring | 2.5px `#808190` (dark `#c9cbda`) outside a 1.5px `#ffffff` (dark `#000`) offset |

### 7.3 Nav rail (`stylesheets/components/NavTabs.scss`, `ts/components/NavTabs.dom.tsx`)
Order, top to bottom: menu toggle, **Chats, Calls, Stories**, flexible space, **Settings**.
The selected tab uses the filled icon variant and the fill-primary-pressed background; hover uses fill-primary.
Item: padding 2px block / 10px inline; button: padding 10px block, radius 8px; icon 20px.
Unread badge: 16px, label-destructive bg, 10px text, top −4px, inline-end −6px.

### 7.4 Empty right pane (`ts/components/ChatsTab.dom.tsx`, `stylesheets/components/Inbox.scss`)
Centered column: Signal logo 96px → "Welcome to Signal" (title-medium, line-height 24px, margin 20px top / 6px bottom).
Signal also shows a "What's new" link and, pinned to the bottom, "Signal is a 501c3 nonprofit" (padding 20px, label-secondary).

### 7.5 Left pane header (`stylesheets/components/NavSidebar.scss`, `ts/components/LeftPane.dom.tsx`)
- Title "Chats": title-medium with line-height 20px; padding-inline 24px; back-button variant uses body-1-bold and a 16px start padding.
- Back button: 20px icon, 4px padding, radius 4px, hover fill-primary.
- "⋯" (more actions) menu items: View Archive, Add chat folder, Folder settings, Notification profile.
- Filter button label: "Filter by unread"; "Clear filter" (`MSGS` `icu:filterByUnreadButtonLabel`, `icu:clearFilterButton`).

### 7.6 Compose (New chat) (`stylesheets/components/ComposeStepButton.scss`, `LeftPaneFindBy*Helper.scss`, `ts/components/leftPane/LeftPaneFindBy*Helper.dom.tsx`)
- Step row icon ("New group", "Find by username", "Find by phone number"): 32px circle, bg black @ 6% (dark white @ 12%), 20px glyph.
- Find-by screens: header with a back button and the title; the input's padding-inline is 12px and there is no search icon; the phone variant puts the country selector above the input (gap 12px, margin-top 8px); a "Next" button sits in the pane footer.

### 7.7 Chat-row date rules (`ts/util/formatTimestamp.dom.ts` `formatDateTimeShort` / `formatTime`)
Under 1 min → "Now"; under 1 h → "{n}m"; today → time ("3:45 PM"); under 7 days AND same month → weekday ("Mon"); under 6 months → "Jan 5"; otherwise → "Jan 5, 2024".

### 7.8 Extra strings (`MSGS`)
| Key | String |
|---|---|
| `icu:StandaloneRegistration--back` | Back |
| `icu:StandaloneRegistration--PhoneNumber--header` | Phone number |
| `…--PhoneNumber--description--line-1` / `line-2` | Enter your phone number to verify your account. / Carrier rates may apply. |
| `…--PhoneNumber--placeholder` / `--button` | Phone number / Continue |
| `…--PhoneNumber--RegionCodeSelector--Label` | Select country code |
| `…--PhoneNumber--Confirmation--description` | Is your phone number above correct? |
| `…--PhoneNumber--Confirmation--cancel` / `--confirm` | Edit number / Yes |
| `…--VerificationCode--header` | Verification code |
| `…--VerificationCode--description` | Enter the code we sent to {phoneNumber} |
| `…--VerificationCode--wrong-number` | Wrong number? |
| `…--VerificationCode--send-sms` / `--call-me` | Resend code / Call me |
| `…--VerificationCode--IncorrectCode--description` | The code you entered is incorrect. Please review the 6 digit code and try again. |
| `…--VerificationCode--IncorrectCode--button` | OK |
| `…--ProfileEntry--header` | Set up your profile |
| `…--ProfileEntry--description` | Profiles are visible to people you message, contacts, and groups. |
| `…--ProfileEntry--add-photo` | Add photo |
| `…--ProfileEntry--first-name` / `--last-name` | First name (required) / Last name (optional) |
| `…--ProfileEntry--continue` | Continue |
| `icu:ProfileEditor--edit-photo` | Edit photo |
| `icu:LeftPaneFindByHelper__title--findByUsername` / `--findByPhoneNumber` | Find by username / Find by phone number |
| `icu:LeftPaneFindByHelper__placeholder--findByUsername` / `--findByPhoneNumber` | Username / Phone number |
| `icu:LeftPaneFindByHelper__description--findByUsername` | Enter a username followed by a dot and its set of numbers. |
| `icu:next2` | Next |
| `icu:createNewGroupButton` | New group |
| `icu:noContactsFound` | No contacts found |
| `icu:startConversation--phone-number-not-found` | User not found. "{phoneNumber}" is not a Signal user. |
| `icu:startConversation--username-not-found` | {atUsername} is not a Signal user. Make sure you've entered the complete username. |
| `icu:avatarMenuViewArchive` | View Archive |
| `icu:LeftPane__MoreActionsMenu__AddChatFolder` / `__FolderSettings` | Add chat folder / Folder settings |
| `icu:NotificationProfileMenuItem` | Notification profile |

## 8. Timeline / chat screen (added Phase 5)

### 8.1 Message grouping (`ts/util/timelineUtil.std.ts`)
Two consecutive messages are "in the same group" (collapsed) when **all** of: same `author.id`,
same calendar day (`isSameDay`), the newer one's timestamp is within **3 minutes**
(`COLLAPSE_WITHIN = 3 * MINUTE`) of the older one's, the newer one isn't older than the previous
(no out-of-order flip), and there is no unread-indicator between them. A message directly above an
"Unread Messages" divider is never collapsed into the one below it, and vice versa.
`shouldCollapseAbove` / `shouldCollapseBelow` each run this same-group check against the neighbor on
that side — this is what drives the 4px corner / 1px margin rule already in §3.

**Metadata (time + status) hides** on a grouped-below message only when: it actually is grouped below
a newer one, it isn't an edited message, and its status isn't `sending`/`paused`/`error`/`partial-sent`
(an in-flight or failed message always keeps its own metadata visible, even mid-group).
Source: `shouldCurrentMessageHideMetadata` in the same file.

### 8.2 Day separator (`ts/components/conversation/TimelineDateHeader.dom.tsx`)
Centered row, `padding: 20px` all sides (Tailwind `p-5`). Text style body-medium (13px), `label-secondary`
color (gray-60 / gray-25) — same text style as the chat-row preview, not caption. No background or pill
in the plain 1:1/group case (the pill variant is only for the "Signal" system conversation). Shown when
the item is the oldest loaded message, or when its day differs from the previous item's day
(`!isSameDay`). Label reuses `formatDate`: Today / Yesterday / weekday / "Jan 5" / "Jan 5, 2024" — the
same rule as the chat-row date (§7.7).

### 8.3 Typing indicator bubble (`ts/components/conversation/TypingAnimation.dom.tsx`, `_modules.scss` `.module-typing-animation*`)
Confirms and extends §3's "Typing indicator dots" row: container `height: 8px; width: 38px` standalone,
**30px wide** inside a message bubble (`.module-message__typing-animation-container`); `padding-inline: 1px`.
Each dot: 6×6 circle, `opacity: 0.4` at rest, color gray-60 (light) / white (dark). Keyframes
`typing-animation`: 0% opacity .4 → 20% `scale(1.3)` + opacity 1 → 40% opacity .4 (back to .4 and holds to
100%), duration **1600ms**, `ease`, infinite, and **only animates while the page is visible**
(`only-when-page-is-visible` mixin — pause it on `document.hidden`). Dot 2 delays **160ms**, dot 3 delays
**320ms** (staggered ripple). Rendered as an incoming-style bubble (same geometry as a normal incoming
message bubble, `surface-message-incoming` background) sitting where the next incoming message would go,
with a `row-reverse` 28px avatar slot for groups (not needed for 1:1).

### 8.4 Composer send-button swap (`ts/components/CompositionArea.dom.tsx`, line ~1377)
The microphone button and the send button occupy the same slot and are **mutually exclusive**, driven by
`dirty` (true once the input has any content) and `shouldShowMicrophone`: mic shows only `!dirty`; send
shows when `dirty || !shouldShowMicrophone`. I.e. empty composer → mic icon in that slot; typing starts →
mic swaps for the send (paper-plane / arrow) icon. The "+" attach button is unaffected and stays visible always.

### 8.5 Message bubble timestamp format (`ts/util/formatTimestamp.dom.ts` `formatTime`, used by `MessageTimestamp.dom.tsx`)
`< 1 min` → "Now" (`icu:justNow`); `< 1 hour` → "{n}m" (`icu:minutesAgo`, floor of minutes); otherwise →
localized clock time, `hour: 'numeric', minute: '2-digit'` (e.g. "3:45 PM") — **not** relative "{n}h" in the
bubble (that form is reserved for `isRelativeTime` contexts like the chat row, §7.7, which is a different
formatter, `formatDateTimeShort`). The bubble never shows a date, only this clock-ish string; the day
separator (§8.2) carries the date.

### 8.6 Scroll-to-bottom button (`ts/components/conversation/ScrollDownButton.dom.tsx`, `stylesheets/components/ScrollDownButton.scss`)
36×36px circular button (`border-radius: 18px`), no border, drop shadow
`0 0 2px rgba(0,0,0,.2), 0 2px 6px rgba(0,0,0,.12)`, floats bottom-right of the timeline. Carries an
unread-count badge (same "99+" cap as the chat-row badge, §4) when there are unread messages below the
fold; plain chevron-down with no badge when just scrolled up with nothing new. Out of scope for this phase
(not in the reference screenshots) — can be added in a later polish pass; noted here so it isn't invented
differently if built later.

### 8.7 Failed-send icon (`ts/components/conversation/Message.dom.tsx` `.module-message__error-container`)
Confirms §5: the error icon renders in its own `module-message__error-container`, outside and to the
start side of the bubble (same slot the avatar/timestamp-on-hover would use), not inside the bubble body.
Color is the legacy accent-red `#f44336` in both themes (not a semantic token). No inline "Send failed"
text sits next to the bubble — that wording appears only in the message Info view per §6.6; the bubble
communicates failure through the icon alone, clickable to retry.

### 7.9 Modal (`stylesheets/components/Modal.scss`, `stylesheets/_mixins.scss` `popper-shadow`, `stylesheets/components/Button.scss`; width from `reference/modal.png`)
| Property | Value |
|---|---|
| Width | 360px (measured from the screenshot) |
| Radius | 8px |
| Background | material-dialog: `#fafafa` @ 90% (dark `#353535` @ 90%) |
| Shadow | `0 8px 20px rgba(0,0,0,.3), 0 0 8px rgba(0,0,0,.05)` |
| Header | padding 16px 16px 1em; title body-1-bold; close button 20px icon, radius 4px |
| Body | body-1, padding-inline 16px |
| Footer | padding 1em 16px 16px, buttons right-aligned, 4px apart |
| Footer button (legacy primary) | radius 4px, padding 8px 16px, body-1-bold, bg fill-accent, white text |
| Backdrop | fill-overlay |

### 7.10 Composer when the user has left a group (`ts/components/CompositionArea.dom.tsx`; `ts/state/smart/CompositionArea.preload.tsx:369` passes `left={conversation.left ?? null}`)
**`left === true` renders no special UI and no text.** The prop is read in only two places (lines 1090 and 1114), and in both it only *skips* a screen:
1. skips the "share your profile" prompt (the `MandatoryProfileSharingActions` screen, used for direct chats and old V1 groups);
2. skips the "upgrade this old V1 group" prompt (`GroupV1DisabledActions`).

With `left` true, the component runs the same checks in the same order as for a member:
terminated → blocked / message request → SMS-only → pending approval → announcements-only → recording → the normal composer (`.CompositionArea`).
So a left, non-terminated, accepted group shows the **normal composer**. The text "You are no longer a member of the group." (`icu:youLeftTheGroup`) is not in this file. It appears only in the timeline notice `ts/components/conversation/GroupNotification.dom.tsx:115` and the toast `ts/components/ToastManager.dom.tsx:654`.
I did not trace how the composer gets disabled elsewhere (e.g. in `CompositionInput`), so I don't know whether it is non-interactive in the real app.

**Closest real "can't send" layout, the terminated-group banner** (same file, lines 1016-1028; screenshot `reference/removed-member-closest.png` / `-dark.png`, story `components-compositionarea--terminated-group`):
| Property | Value |
|---|---|
| Text | "You can't send messages because the group has ended." (`icu:CompositionArea--group-terminated`, `_locales/en/messages.json:6429`) |
| Replaces | the whole composer (no input, no buttons) |
| Layout | one centered text line inside a full-width block |
| Top edge | 1px line, `border-primary` (axo-color-border-primary, `ts/axo/_tailwind-theme/colors.css:467`: black @ 6% light, white @ 6% dark) |
| Vertical padding | 16px top and bottom |
| Type | `type-body-small`, colour `text-secondary` |
| Test id | `CompositionArea--group-terminated` |

## 9. Keyboard shortcuts (added Phase 6)

Source: `ts/components/ShortcutGuide.dom.tsx` (lists at lines 72-369, rendering at 444+; modal wrapper `ShortcutGuideModal.dom.tsx`). Labels are from `MSGS` (`icu:Keyboard--*`). Story: `components-shortcutguide--default` (Windows/Linux keys) and `components-shortcutguide--mac`. Modal title: "Keyboard Shortcuts". The guide has four sections: Navigation, Messages, Composer, Calling.

Key names in the source: `commandOrCtrl` = Cmd on macOS, Ctrl elsewhere; `optionOrAlt` = Option / Alt; `ctrlOrAlt` = Ctrl on macOS, Alt elsewhere (calling accept/start/end shortcuts). Two combos on one row means either works.

### 9.1 Navigation (`getNavigationShortcuts`, lines 72-199)
| Action | Keys |
|---|---|
| Navigate by section | Cmd/Ctrl+T, or Cmd/Ctrl+F6 |
| Previous chat | Opt/Alt+↑, or Ctrl+Shift+Tab |
| Next chat | Opt/Alt+↓, or Ctrl+Tab |
| Previous unread chat | Opt/Alt+Shift+↑ |
| Next unread chat | Opt/Alt+Shift+↓ |
| Jump to chat | Cmd/Ctrl+1 to 9 |
| Focus oldest unread or last message | Cmd/Ctrl+J |
| Preferences | Cmd/Ctrl+, |
| Open chat menu | Cmd/Ctrl+Shift+L |
| Start new chat | Cmd/Ctrl+N |
| Search | Cmd/Ctrl+F |
| Search in chat | Cmd/Ctrl+Shift+F |
| Focus composer | Cmd/Ctrl+Shift+T |
| Open All Media view | Cmd/Ctrl+Shift+M |
| Open emoji chooser | Cmd/Ctrl+Shift+J |
| Open sticker chooser | Cmd/Ctrl+Shift+O |
| Open GIF chooser | Cmd/Ctrl+Shift+G |
| Begin recording voice note | Cmd/Ctrl+Shift+Y |
| Archive chat | Cmd/Ctrl+Shift+A |
| Unarchive chat | Cmd/Ctrl+Shift+U |
| Scroll to top of list | Cmd/Ctrl+↑ |
| Scroll to bottom of list | Cmd/Ctrl+↓ |
| Close current chat | Cmd/Ctrl+Shift+C |

### 9.2 Messages (`getMessageShortcuts`, lines 201-247)
| Action | Keys |
|---|---|
| Default action for selected message | Enter |
| View selected message details | Cmd/Ctrl+D |
| Toggle reply to selected message | Cmd/Ctrl+Shift+R |
| Toggle emoji-reaction picker for selected message | Cmd/Ctrl+Shift+E |
| Save attachment from selected message | Cmd/Ctrl+S |
| Delete selected messages | Cmd/Ctrl+Shift+D |
| Forward selected messages | Cmd/Ctrl+Shift+S |
| Open context menu for selected message | macOS: Cmd+F12; other: Shift+F10 |

### 9.3 Composer (`getComposerShortcuts`, lines 249-314)
| Action | Keys |
|---|---|
| Add newline to message | Shift+Enter |
| Expand composer | Cmd/Ctrl+Shift+K |
| Send (in expanded composer) | Cmd/Ctrl+Enter |
| Attach file | Cmd/Ctrl+U |
| Remove draft link preview | Cmd/Ctrl+P |
| Remove all draft attachments | Cmd/Ctrl+Shift+P |
| Edit the previous message | ↑ |
| Bold / Italic | Cmd/Ctrl+B / Cmd/Ctrl+I |
| Strikethrough | Cmd/Ctrl+Shift+X |
| Monospace | Cmd/Ctrl+E |
| Spoiler | Cmd/Ctrl+Shift+B |

### 9.4 Calling (`getCallingShortcuts`, lines 316-369)
| Action | Keys |
|---|---|
| Toggle mute | Shift+M |
| Toggle video | Shift+V |
| Toggle expanded preview | Shift+P |
| Raise or lower hand (group calls) | Shift+H |
| Answer call with video | CtrlOrAlt+Shift+V |
| Answer call without video | CtrlOrAlt+Shift+A |
| Decline call | CtrlOrAlt+Shift+D |
| Start voice call | CtrlOrAlt+Shift+C |
| Start video call | CtrlOrAlt+Shift+Y |
| End call | CtrlOrAlt+Shift+E |

### 9.5 Screenshots added in Phase 6
`toast`, `settings-appearance`, `settings-privacy`, `settings-notifications`, `stories` (each with a `-dark` twin). Stories: `components-toast--defaults` (toast text "This is a toast", top-left of the page in the story), `components-preferences--appearance`, `components-preferences--privacy`, `components-preferences--notifications`, `components-storiestab--blank`. No Calls tab story exists, so `calls.png` was not captured.

### 9.6 Calls tab strings (strings only; no screenshot, no story exists)
Sources: `ts/components/CallsTab.dom.tsx`, `ts/components/CallsList.dom.tsx`, `_locales/en/messages.json` (keys `icu:CallsTab__*` around line 11149-11197, `icu:CallsList__*` around line 11221).

| Where it shows | Text | Key | Source |
|---|---|---|---|
| Left-pane header title | "Calls" | `icu:CallsTab__HeaderTitle--CallsList` | `CallsTab.dom.tsx:207` |
| Header title on the New Call view | "New Call" | `icu:CallsTab__HeaderTitle--NewCall` | `CallsTab.dom.tsx:208` |
| Header button label | "New Call" | `icu:CallsTab__NewCallActionLabel` | `CallsTab.dom.tsx:232` |
| Header menu button label | "More actions" | `icu:CallsTab__MoreActionsLabel` | `CallsTab.dom.tsx:241` |
| Header menu item | "Clear call history" | `icu:CallsTab__ClearCallHistoryLabel` | `CallsTab.dom.tsx:249` |
| **Left pane, no call history (empty state title)** | "No calls" | `icu:CallsList__EmptyState--noQuery__title` | `CallsList.dom.tsx:1040` |
| **Left pane, no call history (subtitle)** | "Recent calls will appear here." | `icu:CallsList__EmptyState--noQuery__subtitle` | `CallsList.dom.tsx:1041` |
| **Right pane, nothing selected** | "Click [new-call icon] to start a new voice or video call." | `icu:CallsTab__EmptyStateText--with-icon-2` | `CallsTab.dom.tsx:311` |
| Search placeholder | "Search" ("Search missed calls" when the missed filter is on) | `icu:CallsList__SearchInputPlaceholder`, `...--missed-calls` | `CallsList.dom.tsx:1049-1050` |
| Missed filter toggle | "Filter by missed"; header "Filtered by missed"; "Clear filter" | `icu:CallsList__ToggleFilterByMissedLabel`, `icu:CallsList__FilteredByMissedHeader`, `icu:clearFilterButton` | `CallsList.dom.tsx:768-785, 1058` |
| Empty results: missed filter only | "No missed calls" | `icu:CallsList__EmptyState--missedCalls` | `CallsList.dom.tsx:747` |
| Empty results: search only | "No results for “{query}”" | `icu:CallsList__EmptyState--hasQuery` | `CallsList.dom.tsx:745` |
| Empty results: search + missed | "No results for “{query}” in missed calls" | `icu:CallsList__EmptyState--hasQueryAndMissedCalls` | `CallsList.dom.tsx:743` |
| Top of list | "Create a Call Link" | `icu:CallsList__CreateCallLink` | `CallsList.dom.tsx:727` |
| Row status text | Missed / Declined / Call link / Outgoing / Incoming / Active | `icu:CallsList__ItemCallInfo--*` | `CallsList.dom.tsx:853-962` |
| Clear-history dialog | Title "Clear call history?"; body "This will permanently delete all call history."; with call links: "...Call links you’ve created will no longer work for people who have them."; button "Clear" | `icu:CallsTab__ConfirmClearCallHistory__*` | `CallsTab.dom.tsx:348-360` |

The empty-state title/subtitle show only when the list is empty and no search or filter is active (`CallsList.dom.tsx:1039`).
