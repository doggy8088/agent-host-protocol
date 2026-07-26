<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'

const root = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!root.value) return

  const steps = Array.from(root.value.querySelectorAll<HTMLElement>('.wt-reveal'))

  // Respect reduced-motion: just show everything.
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced || typeof IntersectionObserver === 'undefined') {
    steps.forEach((el) => el.classList.add('in-view'))
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view')
          observer?.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.25, rootMargin: '0px 0px -10% 0px' },
  )

  steps.forEach((el) => observer!.observe(el))
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <section ref="root" class="wt" aria-label="代理主機協定如何運作">
    <div class="wt-inner">
      <header class="wt-head wt-reveal">
        <span class="wt-eyebrow">
          <span class="codicon codicon-compass" aria-hidden="true"></span>
          運作方式
        </span>
        <h2 class="wt-title">一個代理程式工作階段，任何用戶端皆可使用。</h2>
        <p class="wt-lead">
          AHP 將代理程式工作階段轉變為一個<strong>共享、同步的資源</strong>，讓任意數量的用戶端都能同時連結。以下是從問題到線路的完整旅程。
        </p>
      </header>

      <!-- STEP 1 — The problem: trapped vs. shared -->
      <article class="wt-step wt-reveal">
        <div class="wt-step-copy">
          <span class="wt-step-num">01</span>
          <span class="wt-kicker wt-kicker-red">
            <span class="codicon codicon-lock" aria-hidden="true"></span>
            問題
          </span>
          <h3>代理程式工作階段受困於它起始的位置。</h3>
          <p>
            對話、回合、待處理的工具核准 — 全都綁定在單一應用程式或控制框架上。一旦切換到其他用戶端、裝置或自動化流程，就無法接續同一個即時工作階段。AHP 將工作階段變成一個<strong>共享資源</strong>，讓它只需存在一次，就能從任何地方驅動。
          </p>
        </div>

        <div class="wt-step-visual">
          <div class="trapped">
            <div class="mockwin">
              <div class="winbar"><i></i><i></i><i></i></div>
              <div class="winbody">
                <span class="sess-chip">
                  <span class="codicon codicon-lock" aria-hidden="true"></span>
                  代理程式工作階段
                </span>
              </div>
            </div>
            <p class="cap">受困於單一應用程式</p>
          </div>

          <span class="wt-arrow codicon codicon-arrow-right" aria-hidden="true"></span>

          <div class="shared">
            <div class="miniwin-row">
              <div class="miniwin"><div class="winbar mini"><i></i><i></i></div><div class="miniline"></div></div>
              <div class="miniwin"><div class="winbar mini"><i></i><i></i></div><div class="miniline"></div></div>
              <div class="miniwin"><div class="winbar mini"><i></i><i></i></div><div class="miniline"></div></div>
            </div>
            <div class="syncrail"></div>
            <p class="cap">
              <span class="codicon codicon-sync wt-green" aria-hidden="true"></span>
              一個即時工作階段，跨用戶端共享
            </p>
          </div>
        </div>
      </article>

      <!-- STEP 2 — Architecture: many clients, one host, many agents -->
      <article class="wt-step wt-step-reverse wt-reveal">
        <div class="wt-step-copy">
          <span class="wt-step-num">02</span>
          <span class="wt-kicker wt-kicker-blue">
            <span class="codicon codicon-circuit-board" aria-hidden="true"></span>
            架構
          </span>
          <h3>一個主機居中，連接多個用戶端與多個代理程式。</h3>
          <p>
            承襲 LSP 與 DAP 的血統，主機持有權威的工作階段狀態。用戶端使用 AHP 溝通；代理程式後端則直接整合。任何用戶端都能驅動任何代理程式 — 而且每個用戶端都保持同步。
          </p>
        </div>

        <div class="wt-step-visual">
          <div class="arch" aria-hidden="true">
            <svg class="arch-wires" viewBox="0 0 360 260" preserveAspectRatio="none">
              <defs>
                <path id="wtA1" d="M45,30 C45,90 180,80 180,120" />
                <path id="wtA2" d="M135,30 C135,90 180,90 180,120" />
                <path id="wtA3" d="M225,30 C225,90 180,90 180,120" />
                <path id="wtA4" d="M315,30 C315,90 180,80 180,120" />
                <path id="wtB1" d="M180,140 C180,200 45,190 45,230" />
                <path id="wtB2" d="M180,140 C180,200 135,190 135,230" />
                <path id="wtB3" d="M180,140 C180,200 225,190 225,230" />
                <path id="wtB4" d="M180,140 C180,200 315,190 315,230" />
              </defs>
              <g class="rails">
                <use href="#wtA1" /><use href="#wtA2" /><use href="#wtA3" /><use href="#wtA4" />
                <use href="#wtB1" /><use href="#wtB2" /><use href="#wtB3" /><use href="#wtB4" />
              </g>
              <g class="flow flow-up">
                <use href="#wtA1" style="animation-duration:1.4s" />
                <use href="#wtA2" style="animation-duration:1.6s" />
                <use href="#wtA3" style="animation-duration:1.5s" />
                <use href="#wtA4" style="animation-duration:1.7s" />
              </g>
              <g class="flow flow-down">
                <use href="#wtB1" style="animation-duration:1.6s" />
                <use href="#wtB2" style="animation-duration:1.4s" />
                <use href="#wtB3" style="animation-duration:1.7s" />
                <use href="#wtB4" style="animation-duration:1.5s" />
              </g>
            </svg>

            <div class="chip chip-client" style="left:12.5%;top:0">
              <span class="codicon codicon-vm" aria-hidden="true"></span>IDE
            </div>
            <div class="chip chip-client" style="left:37.5%;top:0">
              <span class="codicon codicon-globe" aria-hidden="true"></span>網頁
            </div>
            <div class="chip chip-client" style="left:62.5%;top:0">
              <span class="codicon codicon-terminal" aria-hidden="true"></span>CLI
            </div>
            <div class="chip chip-client" style="left:87.5%;top:0">
              <span class="codicon codicon-device-mobile" aria-hidden="true"></span>行動
            </div>

            <div class="host">
              <span class="host-label">代理主機</span>
              <span class="host-sub">權威狀態 · 排序 · 協調</span>
            </div>

            <div class="chip chip-agent" style="left:12.5%;bottom:0">
              <span class="codicon codicon-copilot" aria-hidden="true"></span>Copilot
            </div>
            <div class="chip chip-agent" style="left:37.5%;bottom:0">
              <span class="codicon codicon-hubot" aria-hidden="true"></span>Claude
            </div>
            <div class="chip chip-agent" style="left:62.5%;bottom:0">
              <span class="codicon codicon-symbol-event" aria-hidden="true"></span>Codex
            </div>
            <div class="chip chip-agent" style="left:87.5%;bottom:0">
              <span class="codicon codicon-plug" aria-hidden="true"></span>ACP
            </div>
          </div>
        </div>
      </article>

      <!-- STEP 3 — On the wire: sequenced ledger -->
      <article class="wt-step wt-reveal">
        <div class="wt-step-copy">
          <span class="wt-step-num">03</span>
          <span class="wt-kicker wt-kicker-green">
            <span class="codicon codicon-broadcast" aria-hidden="true"></span>
            線路傳輸
          </span>
          <h3>每次變更都是一個信封，且完全排序。</h3>
          <p>
            主機為每次變動蓋上單調遞增的序號，並廣播給每個已訂閱的用戶端。這條單一有序的串流，就是讓每個視窗保持同步的關鍵。
          </p>
        </div>

        <div class="wt-step-visual">
          <div class="wire">
            <div class="wire-head">
              <span class="state-badge">
                <span class="codicon codicon-server-process" aria-hidden="true"></span>主機
              </span>
              <span class="codicon codicon-arrow-right wt-green" aria-hidden="true"></span>
              <span class="wire-head-note">廣播到每個用戶端</span>
            </div>

            <div class="wire-rail">
              <div class="wire-line" style="--i:0">
                <span class="seq">41</span>
                <span class="evt evt-blue">chat/turnStarted</span>
                <span class="payload">"為 API 用戶端加入重試邏輯"</span>
              </div>
              <div class="wire-line" style="--i:1">
                <span class="seq">42</span>
                <span class="evt evt-blue">chat/delta</span>
                <span class="payload">"好的 — 我會包裝 fetch 呼叫…"</span>
              </div>
              <div class="wire-line" style="--i:2">
                <span class="seq">43</span>
                <span class="evt evt-orange">chat/toolCallStart</span>
                <span class="payload">編輯檔案 · <span class="mono">src/api.ts</span></span>
              </div>
              <div class="wire-line" style="--i:3">
                <span class="seq">46</span>
                <span class="evt evt-orange">chat/toolCallComplete</span>
                <span class="payload"><span class="wt-green">ok</span> · 1 個檔案變更</span>
              </div>
              <div class="wire-line" style="--i:4">
                <span class="seq">47</span>
                <span class="evt evt-green">chat/turnComplete</span>
                <span class="payload">回合 <span class="mono">t_8c1</span> 完成</span>
              </div>
            </div>
          </div>
        </div>
      </article>

      <!-- STEP 4 — Write-ahead reconciliation -->
      <article class="wt-step wt-step-reverse wt-reveal">
        <div class="wt-step-copy">
          <span class="wt-step-num">04</span>
          <span class="wt-kicker wt-kicker-purple">
            <span class="codicon codicon-git-merge" aria-hidden="true"></span>
            協調
          </span>
          <h3>樂觀套用，待回應傳回時再協調。</h3>
          <p>
            用戶端會<em>立即</em>在本地套用自己的操作，再將伺服器的回應 — 蓋有 <code class="wt-code">origin</code> 戳記 — 與其樂觀副本比對。來自其他用戶端的並行編輯，會折疊進同一條有序串流中。
          </p>
        </div>

        <div class="wt-step-visual">
          <div class="recon">
            <div class="recon-col">
              <span class="recon-label"><span class="codicon codicon-edit" aria-hidden="true"></span> 用戶端</span>
              <div class="recon-card recon-optimistic">
                <span class="recon-tag">樂觀</span>
                <code>dispatch(turnStarted)</code>
                <span class="recon-meta">clientSeq <b>7</b> · 已在本機套用</span>
              </div>
            </div>

            <div class="recon-flow">
              <span class="recon-flow-line recon-flow-out"></span>
              <span class="recon-flow-line recon-flow-in"></span>
            </div>

            <div class="recon-col">
              <span class="recon-label"><span class="codicon codicon-server" aria-hidden="true"></span> 主機</span>
              <div class="recon-card recon-confirmed">
                <span class="recon-tag recon-tag-green">已確認</span>
                <code>serverSeq 41</code>
                <span class="recon-meta">origin <b>{ ide, 7 }</b> · 已協調</span>
              </div>
            </div>
          </div>
        </div>
      </article>

      <div class="wt-cta wt-reveal">
        <a class="wt-btn wt-btn-brand" href="/guide/what-is-ahp">
          閱讀指南
        </a>
        <a class="wt-btn wt-btn-alt" href="/specification/overview">
          檢視規格
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.wt {
  --wt-blue: #3b82f6;
  --wt-green: #14a37f;
  --wt-orange: #d97706;
  --wt-purple: #9333ea;
  --wt-red: #e0533d;

  margin: 0 auto;
  padding: 24px 24px 8px;
  max-width: 1152px;
}

.dark .wt {
  --wt-blue: #57a6ff;
  --wt-green: #4ec9b0;
  --wt-orange: #e0a26a;
  --wt-purple: #c586c0;
  --wt-red: #f47267;
}

.wt-inner {
  display: flex;
  flex-direction: column;
  gap: 56px;
}

/* ---- Section header ---- */
.wt-head {
  text-align: center;
  max-width: 720px;
  margin: 0 auto;
}
.wt-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wt-blue);
  padding: 5px 13px;
  border: 1px solid color-mix(in srgb, var(--wt-blue) 32%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--wt-blue) 8%, transparent);
}
.wt-title {
  font-size: clamp(1.7rem, 4vw, 2.5rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 18px 0 0;
  color: var(--vp-c-text-1);
  border: 0;
  padding: 0;
}
.wt-lead {
  margin: 14px auto 0;
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

/* ---- Step layout ---- */
.wt-step {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 40px;
  align-items: center;
}
.wt-step-reverse .wt-step-copy { order: 2; }
.wt-step-reverse .wt-step-visual { order: 1; }

.wt-step-num {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  letter-spacing: 0.1em;
}
.wt-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 10px 0 14px;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
}
.wt-kicker .codicon { font-size: 14px; }
.wt-kicker-red { color: var(--wt-red); }
.wt-kicker-blue { color: var(--wt-blue); }
.wt-kicker-green { color: var(--wt-green); }
.wt-kicker-purple { color: var(--wt-purple); }

.wt-step-copy h3 {
  font-size: clamp(1.25rem, 2.4vw, 1.6rem);
  font-weight: 650;
  line-height: 1.25;
  letter-spacing: -0.01em;
  margin: 0 0 12px;
  color: var(--vp-c-text-1);
  border: 0;
  padding: 0;
}
.wt-step-copy p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}
.wt-code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.85em;
  color: var(--wt-blue);
  background: color-mix(in srgb, var(--wt-blue) 10%, transparent);
  border-radius: 4px;
  padding: 1px 6px;
}
.mono { font-family: var(--vp-font-family-mono); font-size: 0.92em; }
.wt-green { color: var(--wt-green); }

/* ---- Shared visual stage ---- */
.wt-step-visual {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== Step 1: trapped vs shared ===== */
.trapped, .shared { text-align: center; }
.wt-step-visual .trapped,
.wt-step-visual .shared { flex: 0 1 auto; }
.wt-step-visual > .trapped { margin-right: 6px; }

.wt-step:first-of-type .wt-step-visual {
  gap: 18px;
  flex-wrap: wrap;
  padding: 28px 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
}
.wt-arrow { font-size: 22px; color: var(--wt-blue); }

.mockwin {
  width: 178px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  background: var(--vp-c-bg);
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}
.winbar {
  display: flex;
  gap: 5px;
  padding: 8px 11px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}
.winbar i { width: 8px; height: 8px; border-radius: 50%; background: var(--vp-c-text-3); opacity: 0.5; }
.winbar.mini { padding: 5px 6px; gap: 3px; }
.winbar.mini i { width: 5px; height: 5px; }
.winbody { padding: 24px 16px; display: flex; justify-content: center; }
.sess-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid color-mix(in srgb, var(--wt-red) 45%, transparent);
  border-radius: 6px;
  padding: 7px 12px;
  white-space: nowrap;
}
.sess-chip .codicon { font-size: 14px; color: var(--wt-red); }

.miniwin-row { display: flex; gap: 10px; justify-content: center; }
.miniwin {
  width: 58px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  overflow: hidden;
}
.miniline {
  height: 26px;
  margin: 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--wt-blue) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--wt-blue) 35%, transparent);
}
.syncrail {
  height: 3px;
  margin: 12px 6px 10px;
  border-radius: 3px;
  background-image: repeating-linear-gradient(90deg, var(--wt-green) 0 5px, transparent 5px 14px);
  background-size: 14px 3px;
  animation: wtSyncFlow 0.85s linear infinite;
}
@keyframes wtSyncFlow { from { background-position: 0 0; } to { background-position: 14px 0; } }
.cap {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}
.cap .codicon { font-size: 13px; vertical-align: -2px; }

/* ===== Step 2: architecture diagram ===== */
.arch {
  position: relative;
  width: 100%;
  max-width: 440px;
  aspect-ratio: 360 / 260;
}
.arch-wires {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.arch-wires .rails { fill: none; stroke: var(--vp-c-divider); stroke-width: 1.5; }
.arch-wires .flow {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: 3 13;
}
.arch-wires .flow-up { stroke: var(--wt-blue); }
.arch-wires .flow-down { stroke: var(--wt-green); }
.arch-wires .flow-up use { animation: wtDashUp linear infinite; }
.arch-wires .flow-down use { animation: wtDashDown linear infinite; }
@keyframes wtDashUp { from { stroke-dashoffset: 32; } to { stroke-dashoffset: 0; } }
@keyframes wtDashDown { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 32; } }

.chip {
  position: absolute;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  padding: 6px 11px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12);
}
.chip .codicon { font-size: 15px; color: var(--vp-c-text-2); }
.chip-client .codicon { color: var(--wt-blue); }
.chip-agent { border-color: color-mix(in srgb, var(--wt-green) 38%, var(--vp-c-divider)); }
.chip-agent .codicon { color: var(--wt-green); }

.host {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 210px;
  max-width: 64%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
  padding: 12px 16px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--wt-blue) 12%, var(--vp-c-bg));
  border: 1px solid color-mix(in srgb, var(--wt-blue) 45%, transparent);
  box-shadow: 0 0 30px color-mix(in srgb, var(--wt-blue) 22%, transparent);
}
.host-label {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--wt-blue);
}
.host-sub { font-size: 11.5px; line-height: 1.4; color: var(--vp-c-text-2); }

/* ===== Step 3: wire ledger ===== */
.wire {
  width: 100%;
  max-width: 460px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  padding: 16px 16px 18px;
}
.wire-head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 14px;
}
.state-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--wt-blue);
  background: color-mix(in srgb, var(--wt-blue) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--wt-blue) 30%, transparent);
  border-radius: 6px;
  padding: 3px 9px;
}
.state-badge .codicon { font-size: 13px; }
.wire-head-note {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.wire-rail {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 16px;
}
.wire-rail::before {
  content: "";
  position: absolute;
  left: 4px; top: 6px; bottom: 6px;
  width: 2px;
  border-radius: 2px;
  background-image: repeating-linear-gradient(180deg, var(--wt-green) 0 5px, transparent 5px 12px);
  background-size: 2px 12px;
  opacity: 0.7;
  animation: wtRailFlow 0.9s linear infinite;
}
@keyframes wtRailFlow { from { background-position: 0 0; } to { background-position: 0 12px; } }

.wire-line {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 7px;
  padding: 8px 11px;
  opacity: 0;
}
.in-view .wire-line {
  animation: wtLineIn 0.5s var(--vp-ease, cubic-bezier(0.16, 1, 0.3, 1)) forwards;
  animation-delay: calc(0.12s * var(--i) + 0.2s);
}
@keyframes wtLineIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.wire-line .seq {
  flex: none;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: #fff;
  background: var(--wt-blue);
  border-radius: 5px;
  padding: 2px 7px;
  min-width: 26px;
  text-align: center;
}
.wire-line .evt {
  flex: none;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
}
.evt-blue { color: var(--wt-blue); }
.evt-orange { color: var(--wt-orange); }
.evt-green { color: var(--wt-green); }
.wire-line .payload {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wire-line .payload .mono { font-size: 11px; }

/* ===== Step 4: reconciliation ===== */
.recon {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 460px;
  padding: 22px 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}
.recon-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.recon-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}
.recon-label .codicon { font-size: 14px; }
.recon-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 9px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
}
.recon-card code {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-1);
}
.recon-optimistic { border-color: color-mix(in srgb, var(--wt-purple) 45%, transparent); }
.recon-confirmed { border-color: color-mix(in srgb, var(--wt-green) 45%, transparent); }
.recon-tag {
  align-self: flex-start;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 999px;
  color: var(--wt-purple);
  background: color-mix(in srgb, var(--wt-purple) 12%, transparent);
}
.recon-tag-green { color: var(--wt-green); background: color-mix(in srgb, var(--wt-green) 14%, transparent); }
.recon-meta { font-size: 11px; color: var(--vp-c-text-3); }
.recon-meta b { color: var(--vp-c-text-2); font-weight: 600; }

.recon-flow {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 46px;
}
.recon-flow-line {
  height: 2px;
  border-radius: 2px;
  background-size: 12px 2px;
}
.recon-flow-out {
  background-image: repeating-linear-gradient(90deg, var(--wt-purple) 0 5px, transparent 5px 12px);
  animation: wtSyncFlow 0.8s linear infinite;
}
.recon-flow-in {
  background-image: repeating-linear-gradient(270deg, var(--wt-green) 0 5px, transparent 5px 12px);
  animation: wtSyncFlowRev 0.8s linear infinite;
}
@keyframes wtSyncFlowRev { from { background-position: 12px 0; } to { background-position: 0 0; } }

/* ---- CTA — mirrors VitePress's hero buttons ---- */
.wt-cta {
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
  padding-top: 8px;
}
.wt-btn {
  display: inline-block;
  border: 1px solid transparent;
  border-radius: 20px;
  padding: 0 20px;
  line-height: 38px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.25s, border-color 0.25s, background-color 0.25s;
}
.wt-btn-brand {
  border-color: var(--vp-button-brand-border);
  color: var(--vp-button-brand-text);
  background-color: var(--vp-button-brand-bg);
}
.wt-btn-brand:hover {
  border-color: var(--vp-button-brand-hover-border);
  color: var(--vp-button-brand-hover-text);
  background-color: var(--vp-button-brand-hover-bg);
}
.wt-btn-alt {
  border-color: var(--vp-button-alt-border);
  color: var(--vp-button-alt-text);
  background-color: var(--vp-button-alt-bg);
}
.wt-btn-alt:hover {
  border-color: var(--vp-button-alt-hover-border);
  color: var(--vp-button-alt-hover-text);
  background-color: var(--vp-button-alt-hover-bg);
}

/* ---- Reveal animation ---- */
.wt-reveal {
  opacity: 0;
  transform: translateY(26px);
  transition: opacity 0.7s var(--vp-ease, cubic-bezier(0.16, 1, 0.3, 1)),
    transform 0.7s var(--vp-ease, cubic-bezier(0.16, 1, 0.3, 1));
  will-change: opacity, transform;
}
.wt-reveal.in-view {
  opacity: 1;
  transform: none;
}

/* ---- Responsive ---- */
@media (max-width: 860px) {
  .wt-step,
  .wt-step-reverse {
    grid-template-columns: 1fr;
    gap: 22px;
  }
  .wt-step-reverse .wt-step-copy { order: 1; }
  .wt-step-reverse .wt-step-visual { order: 2; }
}

@media (max-width: 640px) {
  .wt {
    padding: 8px 16px 0;
  }
  .wt-inner { gap: 44px; }
  .wt-lead { font-size: 1rem; }

  /* Step 1 — stack the trapped → shared illustration and point the arrow down */
  .wt-step:first-of-type .wt-step-visual {
    flex-direction: column;
    padding: 24px 16px;
  }
  .wt-arrow { transform: rotate(90deg); }

  /* Wire ledger — let long event names wrap instead of squeezing the payload */
  .wire-line {
    flex-wrap: wrap;
    gap: 6px 8px;
  }
  .wire-line .payload {
    flex-basis: 100%;
    padding-left: 34px;
  }

  /* Reconciliation — stack client/host and turn the flow vertical */
  .recon { flex-direction: column; gap: 12px; }
  .recon-flow {
    flex-direction: row;
    width: auto;
    gap: 18px;
  }
  .recon-flow-out {
    background-image: repeating-linear-gradient(180deg, var(--wt-purple) 0 5px, transparent 5px 12px);
    background-size: 2px 12px;
    width: 2px;
    height: 24px;
    animation: wtRailFlow 0.8s linear infinite;
  }
  .recon-flow-in {
    background-image: repeating-linear-gradient(0deg, var(--wt-green) 0 5px, transparent 5px 12px);
    background-size: 2px 12px;
    width: 2px;
    height: 24px;
    animation: wtRailFlowRev 0.8s linear infinite;
  }
}
@keyframes wtRailFlowRev { from { background-position: 0 12px; } to { background-position: 0 0; } }

@media (prefers-reduced-motion: reduce) {
  .syncrail,
  .wire-rail::before,
  .arch-wires .flow use,
  .recon-flow-line,
  .wt-reveal,
  .in-view .wire-line {
    animation: none !important;
    transition: none !important;
  }
  .wt-reveal { opacity: 1; transform: none; }
  .wire-line { opacity: 1; }
}
</style>
