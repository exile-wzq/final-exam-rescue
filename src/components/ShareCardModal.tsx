import { useEffect, useRef, useState } from 'react'
import { Download, LoaderCircle, X } from 'lucide-react'
import { toPng } from 'html-to-image'
import type { MarketingReport } from '../lib/marketing'
import { ShareCard } from './ShareCard'

export function ShareCardModal({
  report,
  onClose,
}: {
  report: MarketingReport
  onClose: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  async function handleDownload() {
    if (!cardRef.current || downloading) return
    setDownloading(true)
    setError('')
    try {
      const exportWidth = cardRef.current.getBoundingClientRect().width
      const pixelRatio = Math.max(3, 1080 / Math.max(1, exportWidth))
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio,
        backgroundColor: '#f5f0e5',
        cacheBust: true,
      })
      const link = document.createElement('a')
      link.download = '期末急救站-期末状态卡.png'
      link.href = dataUrl
      link.click()
    } catch {
      setError('图片生成失败，请稍后再试，或直接截图保存。')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className="share-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <header className="share-modal-head">
          <div>
            <span className="section-kicker">传播状态卡</span>
            <h2 id="share-modal-title">你的期末状态卡</h2>
            <p>适合截图发群、发朋友圈，或直接放进营销 PPT。</p>
          </div>
          <button
            className="icon-button share-modal-close"
            type="button"
            onClick={onClose}
            ref={closeRef}
            aria-label="关闭状态卡"
          >
            <X size={17} />
          </button>
        </header>

        <div className="share-card-stage">
          <ShareCard report={report} cardRef={cardRef} />
        </div>

        <div className="share-modal-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading}
          >
            {downloading ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Download size={16} />
            )}
            {downloading ? '正在生成…' : '保存图片'}
          </button>
          <button className="button button-secondary" type="button" onClick={onClose}>
            先看看
          </button>
        </div>

        {error ? (
          <p className="share-modal-error" role="alert">
            {error}
          </p>
        ) : (
          <p className="share-modal-note">导出为高清 PNG（宽度 ≥ 1080px），适合手机查看与分享。</p>
        )}
      </section>
    </div>
  )
}
