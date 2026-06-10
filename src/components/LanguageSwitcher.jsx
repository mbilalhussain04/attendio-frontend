import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
    { code: 'de', flag: '🇩🇪', name: 'Deutsch', country: 'Germany' },
    { code: 'en', flag: '🇺🇸', name: 'English', country: 'United States' },
    { code: 'fr', flag: '🇫🇷', name: 'Français', country: 'France' },
    { code: 'es', flag: '🇪🇸', name: 'Español', country: 'Spain' },
]

export default function LanguageSwitcher() {
    const { i18n } = useTranslation()
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const dropdownRef = useRef(null)
    const searchRef = useRef(null)

    const current = LANGUAGES.find(l => l.code === i18n.resolvedLanguage) || LANGUAGES[0]

    const filtered = LANGUAGES.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.country.toLowerCase().includes(search.toLowerCase()) ||
        l.code.toLowerCase().includes(search.toLowerCase())
    )

    useEffect(() => {
        if (!open) return
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false)
                setSearch('')
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    useEffect(() => {
        if (open && searchRef.current) searchRef.current.focus()
    }, [open])

    const select = (code) => {
        i18n.changeLanguage(code)
        setOpen(false)
        setSearch('')
    }

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '40px',
                    padding: '0 14px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#1e293b',
                    fontFamily: 'inherit',
                    transition: 'all 0.18s',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.06)',
                }}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span style={{ fontSize: '18px', lineHeight: 1 }}>{current.flag}</span>
                <span style={{ letterSpacing: '0.01em' }}>{current.code.toUpperCase()}</span>
                <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '2px' }}>▾</span>
            </button>

            {open && (
                <div
                    role="listbox"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: '220px',
                        background: 'white',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '18px',
                        boxShadow: '0 16px 48px rgba(37,99,235,0.14)',
                        overflow: 'hidden',
                        zIndex: 200,
                    }}
                >
                    {/* search */}
                    <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #f1f5f9' }}>
                        <input
                            ref={searchRef}
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search language…"
                            style={{
                                width: '100%',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '7px 12px',
                                fontSize: '13px',
                                fontFamily: 'inherit',
                                color: '#0f172a',
                                outline: 'none',
                                background: '#f8fafc',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {/* options */}
                    <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '6px' }}>
                        {filtered.length === 0 && (
                            <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8', padding: '12px 0', margin: 0 }}>
                                No results
                            </p>
                        )}
                        {filtered.map(lang => (
                            <button
                                key={lang.code}
                                role="option"
                                aria-selected={lang.code === current.code}
                                onClick={() => select(lang.code)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    width: '100%',
                                    padding: '9px 12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: lang.code === current.code ? '#eef4ff' : 'transparent',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontFamily: 'inherit',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => { if (lang.code !== current.code) e.currentTarget.style.background = '#f8fafc' }}
                                onMouseLeave={e => { if (lang.code !== current.code) e.currentTarget.style.background = 'transparent' }}
                            >
                                <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>{lang.flag}</span>
                                <div>
                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: lang.code === current.code ? '#2563eb' : '#0f172a' }}>
                                        {lang.name}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                                        {lang.country}
                                    </p>
                                </div>
                                {lang.code === current.code && (
                                    <span style={{ marginLeft: 'auto', color: '#2563eb', fontSize: '14px', fontWeight: 900 }}>✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
