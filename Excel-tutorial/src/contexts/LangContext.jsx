import { createContext, useContext, useState, useEffect } from 'react'

export const LangContext = createContext(null)

// UI strings — content (formulas, story) lives in /data/* with {th, en} fields.
// This dict is just for chrome (tabs, buttons, screen titles).
export const UI = {
  en: {
    appName: "Pumba's Coffee",
    home: 'Home',
    homeButton: '← Home',
    learn: 'Learn',
    skillTree: 'Skill Tree',
    profile: 'Profile',
    settings: 'Settings',

    // mission stages
    stageLesson: 'Lesson',
    stagePractice: 'Practice',
    stageQuiz: 'Quiz',
    quizComingSoon: 'Quiz unlocks in Phase 2',
    nextStage: 'Continue →',
    backToTree: '← Back to skill tree',
    gotIt: 'I got it',
    donePlaying: 'Done playing',

    // lesson sections
    secAnatomy: 'Formula anatomy — tap each piece',
    secSteps: 'Step by step',
    secPractice: 'Try it — change values freely',
    secMistakes: 'Common beginner mistakes',
    secBonus: 'Next level',
    secUseCases: 'Use cases',
    tapHint: '👆 Tap a piece of the formula to see what it does',
    stepLabel: 'Step',
    prev: '← Prev',
    next: 'Next →',
    wrong: 'Wrong',
    right: 'Right',
    why: 'Why',

    // story / chapter
    chapterLabel: 'Chapter',
    continueStory: 'Continue',
    skipStory: 'Skip story',
    chapterStart: 'Start mission',

    // copy / clipboard
    copy: 'Copy',
    copied: '✓ Copied',
    result: 'Result',

    // skill tree
    locked: 'Locked',
    available: 'Available',
    inProgress: 'In progress',
    completed: 'Completed',
    phase1Note: 'Phase 1 preview — all formulas unlocked. Quizzes & game loop arrive in Phase 2.',
    welcomeBack: 'Welcome back',
    welcomeFirst: "Welcome to Pumba's Coffee Shop",
  },
  th: {
    appName: 'ร้านกาแฟพุมบ้า',
    home: 'หน้าแรก',
    homeButton: '← Home',
    learn: 'เรียน',
    skillTree: 'ผังทักษะ',
    profile: 'โปรไฟล์',
    settings: 'ตั้งค่า',

    stageLesson: 'บทเรียน',
    stagePractice: 'ทดลอง',
    stageQuiz: 'ทดสอบ',
    quizComingSoon: 'แบบทดสอบจะเปิดใน Phase 2',
    nextStage: 'ต่อไป →',
    backToTree: '← กลับไปผังทักษะ',
    gotIt: 'เข้าใจแล้ว',
    donePlaying: 'พอแล้ว',

    secAnatomy: 'กายวิภาคของสูตร — แตะแต่ละส่วน',
    secSteps: 'ขั้นตอนทีละ step',
    secPractice: 'ทดลองใช้งาน — แก้ค่าได้เลย',
    secMistakes: 'ข้อผิดพลาดที่มือใหม่มักทำ',
    secBonus: 'ขั้นต่อไป',
    secUseCases: 'ใช้ทำอะไรได้บ้าง',
    tapHint: '👆 แตะแต่ละส่วนของสูตรเพื่อดูคำอธิบาย',
    stepLabel: 'ขั้นตอนที่',
    prev: '← ก่อนหน้า',
    next: 'ถัดไป →',
    wrong: 'ผิด',
    right: 'ถูก',
    why: 'เพราะ',

    chapterLabel: 'บทที่',
    continueStory: 'ต่อ',
    skipStory: 'ข้าม',
    chapterStart: 'เริ่มภารกิจ',

    copy: 'คัดลอก',
    copied: '✓ คัดลอกแล้ว',
    result: 'ผลลัพธ์',

    locked: 'ยังไม่เปิด',
    available: 'พร้อมเรียน',
    inProgress: 'กำลังเรียน',
    completed: 'เรียนจบแล้ว',
    phase1Note: 'ตัวอย่าง Phase 1 — เปิดทุกสูตรแล้ว แบบทดสอบและระบบเกมจะมาใน Phase 2',
    welcomeBack: 'ยินดีต้อนรับกลับมา',
    welcomeFirst: 'ยินดีต้อนรับสู่ร้านกาแฟพุมบ้า',
  },
}

const STORAGE_KEY = 'pumba-excel-lang'

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'th' || saved === 'en') return saved
    } catch {}
    return 'en' // default English per design
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang) } catch {}
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  const toggle = () => setLang(l => (l === 'th' ? 'en' : 'th'))
  const t = UI[lang]

  return (
    <LangContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
