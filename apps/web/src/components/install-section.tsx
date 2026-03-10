'use client';

import { useState } from 'react';
import { CopyButton } from './ui';

const platforms = ['macOS / Linux', 'Windows'] as const;
type Platform = (typeof platforms)[number];

const INSTALL_PATH = '%USERPROFILE%\\.local\\bin';



function MacLinuxGuide() {
  const INSTALL_CMD = 'curl -fsSL https://raw.githubusercontent.com/planetarium/a2a-x402-wallet/main/scripts/install.sh | sh';
  const steps: { id: string; num: string; title: string; desc: React.ReactNode; content: React.ReactNode }[] = [
    {
      id: 'install',
      num: '1',
      title: 'Run the install script',
      desc: 'Paste the command below into your terminal. The script downloads and installs the latest binary.',
      content: (
        <div className="relative rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="absolute top-3 right-3">
            <CopyButton text={INSTALL_CMD} ariaLabel="Copy command" />
          </div>
          <pre className="px-5 py-4 font-mono text-[13px] leading-6 overflow-x-auto pr-10">
            <span className="block">
              <span className="select-none text-zinc-600 mr-2">$</span>
              <span className="text-zinc-100">{INSTALL_CMD}</span>
            </span>
          </pre>
        </div>
      ),
    },
    {
      id: 'verify',
      num: '2',
      title: 'Verify the installation',
      desc: 'Open a new terminal and confirm the install.',
      content: (
        <div className="relative rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="absolute top-3 right-3">
            <CopyButton text="a2a-wallet --version" ariaLabel="Copy command" />
          </div>
          <div className="px-5 py-4 pr-10 font-mono text-[13px] leading-6">
            <span className="select-none text-zinc-600 mr-2">$</span>
            <span className="text-zinc-100">a2a-wallet --version</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800">
      {steps.map(({ id, num, title, desc, content }) => (
        <div key={id} className="px-5 py-4 flex gap-4">
          <div className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 text-[10px] font-bold text-zinc-500 mt-0.5">
            {num}
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <p className="text-sm font-semibold text-zinc-200">{title}</p>
            <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
            {content}
          </div>
        </div>
      ))}
    </div>
  );
}

function WindowsGuide() {
  const steps: { id: string; num: string; title: string; desc: React.ReactNode; content: React.ReactNode }[] = [
    {
      id: 'download',
      num: '1',
      title: 'Download the installer',
      desc: 'Download the Windows executable from GitHub Releases.',
      content: (
        <a
          href="https://github.com/planetarium/a2a-x402-wallet/releases/latest/download/a2a-wallet-windows-x64.exe"
          className="flex items-center justify-center gap-2 w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          a2a-wallet-windows-x64.exe
        </a>
      ),
    },
    {
      id: 'rename',
      num: '2',
      title: 'Rename the file',
      desc: 'Rename the downloaded file as follows.',
      content: (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
          <code className="flex-1 font-mono text-[13px] text-zinc-500 line-through select-none">a2a-wallet-windows-x64.exe</code>
          <svg className="h-3.5 w-3.5 text-zinc-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <code className="flex-1 font-mono text-[13px] text-zinc-100 font-semibold">a2a-wallet.exe</code>
          <CopyButton text="a2a-wallet.exe" ariaLabel="Copy filename" />
        </div>
      ),
    },
    {
      id: 'folder',
      num: '3',
      title: 'Open the install folder',
      desc: (
        <>
          Copy the path below, open <strong className="text-zinc-300 font-medium">File Explorer</strong>{' '}
          (<kbd className="font-mono text-[11px] bg-zinc-800 border border-zinc-700 px-1 py-0.5 rounded">Win+E</kbd>),
          click the address bar{' '}
          (<kbd className="font-mono text-[11px] bg-zinc-800 border border-zinc-700 px-1 py-0.5 rounded">Alt+D</kbd>),
          and paste it. Create the folder if it does not exist.
        </>
      ),
      content: (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
          <svg className="h-3.5 w-3.5 text-zinc-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <code className="flex-1 font-mono text-[13px] text-zinc-100">{INSTALL_PATH}</code>
          <CopyButton text={INSTALL_PATH} ariaLabel="Copy install path" />
        </div>
      ),
    },
    {
      id: 'move',
      num: '4',
      title: 'Move the file',
      desc: 'Paste the renamed a2a-wallet.exe into the folder you just opened.',
      content: (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
          <code className="font-mono text-[13px] text-zinc-100">a2a-wallet.exe</code>
          <span className="text-zinc-600">→</span>
          <code className="font-mono text-[13px] text-zinc-400">{INSTALL_PATH}</code>
        </div>
      ),
    },
    {
      id: 'verify',
      num: '5',
      title: 'Verify the installation',
      desc: 'Open a new terminal and confirm the install.',
      content: (
        <div className="relative rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="absolute top-3 right-3">
            <CopyButton text="a2a-wallet --version" ariaLabel="Copy command" />
          </div>
          <div className="px-5 py-4 pr-10 font-mono text-[13px] leading-6">
            <span className="select-none text-zinc-600 mr-2">$</span>
            <span className="text-zinc-100">a2a-wallet --version</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800">
      {steps.map(({ id, num, title, desc, content }) => (
        <div key={id} className="px-5 py-4 flex gap-4">
          <div className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 text-[10px] font-bold text-zinc-500 mt-0.5">
            {num}
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <p className="text-sm font-semibold text-zinc-200">{title}</p>
            <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
            {content}
          </div>
        </div>
      ))}
    </div>
  );
}

export function InstallSection() {
  // Initializer function avoids calling setState inside useEffect (react-hooks/set-state-in-effect).
  // typeof navigator guard is required for SSR (navigator is not available server-side).
  const [active, setActive] = useState<Platform>(() =>
    typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('win')
      ? 'Windows'
      : 'macOS / Linux'
  );

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center gap-4 mb-5">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-600 tracking-wider uppercase">Quick Start</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      {/* Platform tabs */}
      <div className="flex items-center gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit mx-auto">
        {platforms.map((p) => (
          <button
            key={p}
            onClick={() => setActive(p)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              active === p ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {active === 'Windows' && <WindowsGuide />}
      {active === 'macOS / Linux' && <MacLinuxGuide />}
    </div>
  );
}
