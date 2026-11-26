/**
 * Canonical manifest of Material Symbols Outlined ligature icons bundled into
 * /public/fonts/material-symbols-outlined.woff2.
 *
 * Keeping the icon font subsetted to only the icons used by LifeDesk shrinks
 * the font payload from ~4.02 MB down to ~11 KB (99.7% smaller), preventing
 * 1-2s fallback ligature text flashes and layout shifts during initial load.
 */
export const LIFEDESK_MATERIAL_ICONS = [
  'account_balance_wallet',
  'add',
  'add_circle',
  'add_task',
  'alarm',
  'analytics',
  'arrow_back',
  'auto_stories',
  'calendar_month',
  'calendar_today',
  'check',
  'check_box',
  'check_box_outline_blank',
  'check_circle',
  'checklist',
  'chevron_left',
  'chevron_right',
  'close',
  'cloud_done',
  'cloud_off',
  'code',
  'credit_card',
  'currency_rupee',
  'dark_mode',
  'delete',
  'delete_forever',
  'desktop_windows',
  'directions_bus',
  'done_all',
  'edit',
  'error',
  'event',
  'event_available',
  'event_upcoming',
  'flag',
  'grid_view',
  'info',
  'light_mode',
  'lock',
  'lock_reset',
  'logout',
  'mail',
  'mark_email_read',
  'mark_email_unread',
  'menu_book',
  'note',
  'notifications',
  'palette',
  'payments',
  'person',
  'phone_android',
  'priority_high',
  'radio_button_unchecked',
  'rate_review',
  'receipt',
  'receipt_long',
  'refresh',
  'restaurant',
  'savings',
  'schedule',
  'search',
  'search_off',
  'security',
  'send',
  'shield',
  'shield_lock',
  'star',
  'sync',
  'sync_alt',
  'task',
  'task_alt',
  'terminal',
  'timelapse',
  'tune',
  'verified_user',
  'visibility',
  'visibility_off',
  'warning',
] as const;

export type LifeDeskMaterialIcon = (typeof LIFEDESK_MATERIAL_ICONS)[number];

export const LIFEDESK_MATERIAL_ICON_SET: ReadonlySet<string> = new Set(LIFEDESK_MATERIAL_ICONS);

/**
 * Extracts static Material Symbols ligature names used directly inside
 * elements with the `material-symbols-outlined` class.
 */
export function extractStaticMaterialIconsFromSource(source: string): string[] {
  const found: string[] = [];
  const pattern = /material-symbols-outlined[^>]*>([\s\S]*?)<\/(?:span|button)>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const content = match[1].trim();
    if (/^[a-z0-9_]+$/.test(content)) {
      found.push(content);
    }
  }
  return found;
}
