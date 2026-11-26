import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from '../components/BrandLogo';

export const PrivacyPolicyView: React.FC = () => {
  const { theme, setTheme, isAuthenticated, closePublicPage } = useApp();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col">
      {/* Top utility header */}
      <header className="sticky top-0 z-20 w-full bg-surface/90 backdrop-blur-md border-b border-outline-variant/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={closePublicPage}
              className="flex items-center focus:outline-none"
              aria-label="Return to LifeDesk"
            >
              <BrandLogo variant="full" className="h-8 sm:h-9 w-auto" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              aria-label="Theme selector"
              className="flex items-center bg-surface-container-lowest rounded-xl p-1 border border-outline-variant shadow-xs"
              role="group"
            >
              {(
                [
                  { id: 'light', icon: 'light_mode', label: 'Light' },
                  { id: 'dark', icon: 'dark_mode', label: 'Dark' },
                  { id: 'system', icon: 'desktop_windows', label: 'System' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTheme(opt.id)}
                  title={`${opt.label} Mode`}
                  aria-label={`${opt.label} Mode`}
                  className={`h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    theme === opt.id
                      ? 'bg-surface-container text-on-surface shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={closePublicPage}
              className="h-9 px-3.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>{isAuthenticated ? 'Back to App' : 'Sign In'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Privacy Policy Document */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-10 shadow-xs flex flex-col gap-8">
          {/* Document Header */}
          <div className="border-b border-outline-variant pb-6 flex flex-col gap-3">
            <div className="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-lg bg-surface-container border border-outline-variant text-xs font-semibold text-primary-ink">
              <span className="material-symbols-outlined text-[16px]">shield_lock</span>
              <span>Legal &amp; Privacy</span>
            </div>
            <h1 className="font-display-md sm:font-display-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              Privacy Policy &ndash; LifeDesk
            </h1>
            <p className="text-sm font-medium text-on-surface-variant">
              <strong className="text-on-surface">Last Updated:</strong> November 26, 2026
            </p>
          </div>

          {/* Policy Sections */}
          <div className="flex flex-col gap-7 text-sm sm:text-[15px] leading-relaxed text-on-surface-variant">
            <section className="flex flex-col gap-2.5">
              <h2 className="text-lg font-bold text-on-surface">1. Introduction</h2>
              <p>
                Welcome to LifeDesk. LifeDesk is a personal productivity platform designed to help users manage tasks, deadlines, calendars, expenses, projects, and opportunities.
              </p>
              <p>
                This Privacy Policy explains how LifeDesk collects, uses, stores, and protects your information when you use our application.
              </p>
            </section>

            <section className="flex flex-col gap-2.5">
              <h2 className="text-lg font-bold text-on-surface">2. Information We Collect</h2>
              <p>Depending on the features you use, LifeDesk may collect:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  <strong className="text-on-surface">Account information:</strong> Name, email address, and profile information.
                </li>
                <li>
                  <strong className="text-on-surface">Authentication information:</strong> Information required to sign in using Google or email authentication.
                </li>
                <li>
                  <strong className="text-on-surface">User-generated content:</strong> Tasks, events, deadlines, notes, projects, and opportunity details you create.
                </li>
                <li>
                  <strong className="text-on-surface">Financial entries:</strong> Expense records and other financial information you voluntarily enter.
                </li>
                <li>
                  <strong className="text-on-surface">Feedback:</strong> Messages, suggestions, and feedback submitted through the application.
                </li>
                <li>
                  <strong className="text-on-surface">Technical information:</strong> Basic device, browser, and application usage information needed to operate and improve the service.
                </li>
              </ul>
              <p className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-medium text-xs sm:text-sm">
                We do not ask users to provide financial account passwords or banking login credentials.
              </p>
            </section>

            <section className="flex flex-col gap-2.5">
              <h2 className="text-lg font-bold text-on-surface">3. How We Use Your Information</h2>
              <p>We use collected information to:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>Create and manage user accounts.</li>
                <li>Authenticate users securely.</li>
                <li>Save and synchronize personal data across devices.</li>
                <li>Provide productivity, calendar, task, and expense-management features.</li>
                <li>Respond to feedback and support requests.</li>
                <li>Maintain application security and prevent misuse.</li>
                <li>Improve application functionality and reliability.</li>
              </ul>
            </section>

            <section className="flex flex-col gap-2.5">
              <h2 className="text-lg font-bold text-on-surface">4. Google Sign-In</h2>
              <p>LifeDesk may offer Google Sign-In for account authentication.</p>
              <p>
                When you choose Google Sign-In, Google may share basic profile information with us, such as your name, email address, and profile picture, subject to the permissions you authorize.
              </p>
              <p>
                LifeDesk uses this information to create or authenticate your account. We do not request access to Gmail, Google Drive, Contacts, or other Google services unless explicitly stated in a future feature and separately authorized.
              </p>
              <p>
                Google&apos;s privacy policy is available at:{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-ink font-semibold underline hover:opacity-80 break-all"
                >
                  https://policies.google.com/privacy
                </a>
              </p>
            </section>

            <section className="flex flex-col gap-2.5">
              <h2 className="text-lg font-bold text-on-surface">5. Data Storage and Security</h2>
              <p>LifeDesk uses Supabase services for authentication and data storage.</p>
              <p>
                We use appropriate technical measures, including authenticated access and database access controls, to help protect user information.
              </p>
              <p>
                Each user&apos;s private data is intended to be accessible only to that user&apos;s authenticated account. However, no internet-based service can guarantee absolute security.
              </p>
            </section>

            <section className="flex flex-col gap-2.5">
              <h2 className="text-lg font-bold text-on-surface">6. Data Sharing</h2>
              <p>We do not sell or rent personal information to third parties.</p>
              <p>
                Information may be processed by service providers that help operate LifeDesk, such as:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  <strong className="text-on-surface">Supabase:</strong> Authentication and database services.
                </li>
                <li>
                  <strong className="text-on-surface">Resend:</strong> Transactional email delivery, where configured.
                </li>
                <li>
                  <strong className="text-on-surface">Vercel:</strong> Application hosting and deployment.
                </li>
              </ul>
              <p>
                These providers process information as needed to provide their services and according to their applicable policies.
              </p>
            </section>

            <section className="flex flex-col gap-2.5">
              <h2 className="text-lg font-bold text-on-surface">7. Data Retention and Account Deletion</h2>
              <p>
                We retain account information and user-generated data for as long as necessary to provide LifeDesk.
              </p>
              <p>
                If you wish to delete your account or request deletion of your personal information, contact us using the email address below. We will review and process eligible requests, subject to applicable legal requirements.
              </p>
            </section>

            <section className="flex flex-col gap-2.5">
              <h2 className="text-lg font-bold text-on-surface">8. Cookies and Local Storage</h2>
              <p>
                LifeDesk and its authentication services may use cookies, browser storage, or similar technologies to maintain login sessions, remember preferences, and support application functionality.
              </p>
              <p>
                You can manage browser storage through your browser settings. Clearing it may sign you out or reset certain preferences.
              </p>
            </section>

            <section className="flex flex-col gap-2.5">
              <h2 className="text-lg font-bold text-on-surface">9. Children&apos;s Privacy</h2>
              <p>
                LifeDesk is not intentionally designed to collect personal information from children in violation of applicable privacy laws. If you believe a child has provided personal information improperly, contact us so that we can review the request.
              </p>
            </section>

            <section className="flex flex-col gap-2.5">
              <h2 className="text-lg font-bold text-on-surface">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy when LifeDesk&apos;s features or practices change. Updated versions will be published on this page with a revised &ldquo;Last Updated&rdquo; date.
              </p>
            </section>

            <section className="flex flex-col gap-3 pt-4 border-t border-outline-variant">
              <h2 className="text-lg font-bold text-on-surface">11. Contact Us</h2>
              <p>For privacy-related questions, data requests, or concerns, contact:</p>
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col gap-1.5 text-sm">
                <p>
                  <strong className="text-on-surface">Email:</strong>{' '}
                  <a
                    href="mailto:raj2010arpit@gmail.com"
                    className="text-primary-ink font-semibold hover:underline"
                  >
                    raj2010arpit@gmail.com
                  </a>
                </p>
                <p>
                  <strong className="text-on-surface">Application:</strong>{' '}
                  <span className="text-on-surface">LifeDesk</span>
                </p>
                <p>
                  <strong className="text-on-surface">Website:</strong>{' '}
                  <a
                    href="https://lifedesk.awakenedarpit.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-ink font-semibold hover:underline break-all"
                  >
                    https://lifedesk.awakenedarpit.xyz
                  </a>
                </p>
              </div>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
};
