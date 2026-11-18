import { Link } from 'react-router-dom'

export function AppHeader({ hasPlan }: { hasPlan: boolean }) {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" to="/" aria-label="返回期末急救站首页">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span className="brand-copy">
            <strong>期末急救站</strong>
            <small>FINAL WEEK RESCUE</small>
          </span>
        </Link>
        <div className="header-status">
          <span className="status-dot" aria-hidden="true" />
          {hasPlan ? '计划已保存在本机' : '数据仅存本机'}
        </div>
      </div>
    </header>
  )
}
