import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  MoreVertical,
  Share,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from './usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'hud' | 'card';
}

export function PWAInstallButton({ variant = 'hud' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showMobileGuide, setShowMobileGuide] = useState(false);
  const [selectedOS, setSelectedOS] = useState<'android' | 'ios'>('android');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setSelectedOS(isIOS ? 'ios' : 'android');
  }, [isIOS]);

  if (isInstalled) {
    return null;
  }

  const handleInstallAction = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowMobileGuide(true);
  };

  const handleCopyGameLink = async () => {
    if (typeof window === 'undefined') return;
    const gameUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Fallback copy for restricted mobile webviews
      try {
        const input = document.createElement('input');
        input.value = gameUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        setCopiedLink(true);
        window.setTimeout(() => setCopiedLink(false), 2200);
      } catch {
        // Ignore if clipboard access is blocked
      }
    }
  };

  const buttonClassName =
    variant === 'card'
      ? 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-[#0c2d1d] px-5 py-2.5 text-sm font-semibold text-emerald-100 transition-colors hover:border-emerald-300/55 hover:bg-[#13422b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 whitespace-nowrap cursor-pointer'
      : 'inline-flex h-11 w-11 sm:w-auto items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-[#06180f]/85 sm:px-3.5 text-xs font-semibold text-emerald-100 transition-colors hover:border-emerald-300/50 hover:bg-[#0c2d1d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 whitespace-nowrap cursor-pointer';

  const labelClassName = variant === 'hud' ? 'hidden sm:inline' : '';

  return (
    <>
      <button
        type="button"
        onClick={handleInstallAction}
        aria-label={
          isInstallable
            ? 'Install Chameleon Catch app'
            : 'How to install Chameleon Catch on mobile'
        }
        title={isInstallable ? 'Install App' : 'Install on Mobile'}
        className={buttonClassName}
      >
        {isInstallable ? (
          <>
            <Download className="h-4 w-4" />
            <span className={labelClassName}>Install App</span>
          </>
        ) : (
          <>
            <Smartphone className="h-4 w-4" />
            <span className={labelClassName}>Install on Phone</span>
          </>
        )}
      </button>

      {showMobileGuide && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#030e09]/80 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-install-title"
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-emerald-300/25 bg-[#061a11] p-6 text-left shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setShowMobileGuide(false)}
              aria-label="Close mobile install instructions"
              className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-lg text-emerald-200/80 hover:bg-emerald-900/50 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h3
              id="mobile-install-title"
              className="pr-8 font-display text-xl font-bold text-[#fef08a]"
            >
              Install Chameleon Catch on Phone
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-emerald-100/80">
              Add the game straight to your phone&apos;s home screen to play
              fullscreen and offline.
            </p>

            {isInIframe && (
              <div className="mt-3.5 rounded-xl border border-amber-300/30 bg-[#1e1706]/85 p-3 text-xs leading-relaxed text-amber-100/90">
                <p>
                  <strong className="text-[#fef08a]">Important:</strong> Open
                  the game&apos;s standalone link in your phone&apos;s browser
                  first so your phone installs{' '}
                  <strong className="text-white">Chameleon Catch</strong>{' '}
                  instead of AI Studio.
                </p>
                <button
                  type="button"
                  onClick={handleCopyGameLink}
                  className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-300/35 bg-amber-400/15 px-3 py-1.5 font-semibold text-[#fef08a] transition-colors hover:bg-amber-400/25 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Game Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Standalone Game Link</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Mobile OS Tabs (Android vs iPhone/iPad) */}
            <div
              role="tablist"
              aria-label="Mobile device type"
              className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-emerald-300/20 bg-[#04120b] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedOS === 'android'}
                onClick={() => setSelectedOS('android')}
                className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  selectedOS === 'android'
                    ? 'bg-emerald-400 text-[#052013]'
                    : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                Android (Chrome)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={selectedOS === 'ios'}
                onClick={() => setSelectedOS('ios')}
                className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  selectedOS === 'ios'
                    ? 'bg-emerald-400 text-[#052013]'
                    : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                iPhone / iPad (Safari)
              </button>
            </div>

            {selectedOS === 'android' ? (
              <ol className="mt-4 space-y-2.5 text-sm leading-relaxed text-emerald-100/90">
                <li>
                  1. Open the standalone game link in{' '}
                  <strong className="text-white">Chrome</strong> on your phone.
                </li>
                <li className="flex items-start gap-1.5">
                  <span>2.</span>
                  <span>
                    Tap the{' '}
                    <MoreVertical className="inline h-4 w-4 text-[#fef08a]" />{' '}
                    <strong className="text-white">Menu</strong> button in the
                    top-right corner.
                  </span>
                </li>
                <li>
                  3. Tap{' '}
                  <strong className="text-white">Add to Home screen</strong>{' '}
                  (or <strong className="text-white">Install app</strong>) and
                  tap <strong className="text-white">Install</strong>.
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2.5 text-sm leading-relaxed text-emerald-100/90">
                <li>
                  1. Open the standalone game link in{' '}
                  <strong className="text-white">Safari</strong> on your iPhone
                  or iPad.
                </li>
                <li className="flex items-start gap-1.5">
                  <span>2.</span>
                  <span>
                    Tap the <Share className="inline h-4 w-4 text-[#fef08a]" />{' '}
                    <strong className="text-white">Share</strong> icon in
                    Safari&apos;s toolbar.
                  </span>
                </li>
                <li>
                  3. Scroll down and tap{' '}
                  <strong className="text-white">Add to Home Screen</strong>,
                  then tap <strong className="text-white">Add</strong>.
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowMobileGuide(false)}
              className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-emerald-500 px-5 py-2 font-display text-sm font-bold text-[#052013] transition-colors hover:bg-emerald-400 cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl border border-amber-300/35 bg-[#1a1506]/90 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-lg"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Offline Mode · Ready to Play</span>
    </div>
  );
}
