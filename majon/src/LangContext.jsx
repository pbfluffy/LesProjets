import { createContext, useContext } from 'react'

export const LangContext = createContext(null)

export const STRINGS = {
  en: {
    appName: 'MaJon',
    tagline: "Report a stray dog you spotted — see if someone's already named it",
    navMap: 'Map',
    navReport: 'Report a dog',

    signIn: 'Sign in',
    signInWithGoogle: 'Continue with Google',
    signOut: 'Sign out',
    signInRequired: 'Sign in to report a dog — browsing the map is open to everyone.',
    signInBlurb: 'Sign in so your reports are credited and you can edit dogs you added.',

    mapLocate: 'Find my location',
    mapLocateStop: 'Stop tracking',
    mapLocateDenied: 'Location permission denied',
    mapLocateError: "Couldn't find your location",
    mapLocateUnsupported: 'Geolocation not supported',
    mapEmptyHint: 'No dogs reported near here yet — be the first!',

    reportTitle: 'Report a dog',
    reportTakePhoto: 'Take or choose a photo',
    reportRetake: 'Choose a different photo',
    reportGettingLocation: 'Getting your location…',
    reportLocationDenied: 'Location permission denied — we need it to match nearby dogs.',
    reportLocationError: "Couldn't get your location",
    reportUploading: 'Uploading photo…',
    reportAnalyzing: 'Looking at the photo…',
    reportUploadError: 'Something went wrong uploading that photo — try again.',
    reportSearching: 'Checking for dogs already reported nearby…',
    reportCandidatesTitle: 'Is this one of these dogs?',
    reportCandidatesHint: 'Found {n} dog(s) reported near this spot',
    reportSameDog: 'Yes, same dog',
    reportNoCandidates: 'No dogs reported near here yet',
    reportNotListed: "None of these — it's a new dog",
    reportNameLabel: 'Give this dog a name',
    reportNamePlaceholder: 'e.g. Somchai, Brownie, Sunny',
    reportNoteLabel: 'Note (optional)',
    reportNotePlaceholder: 'Anything worth mentioning — friendly, injured, has a collar…',
    reportSubmit: 'Submit report',
    reportSubmitting: 'Saving…',
    reportSuccessNew: 'New dog added! 🐾',
    reportSuccessMatched: 'Sighting added to {name}',
    reportAnother: 'Report another',
    reportRateLimited: "You've hit today's report limit — try again tomorrow.",
    distanceAway: '{d}m away',

    dogUnnamed: 'Unnamed dog',
    dogLastSeen: 'Last seen',
    dogSightings: 'Sightings',
    dogReportSighting: 'Report another sighting of this dog',
    dogRename: 'Edit name',
    dogSave: 'Save',
    dogCancel: 'Cancel',
    dogClose: 'Close',
    dogReportedBy: 'Reported by {name}',
  },
  th: {
    appName: 'MaJon',
    tagline: 'รายงานหมาจรที่เจอ — ดูว่ามีใครตั้งชื่อไว้แล้วหรือยัง',
    navMap: 'แผนที่',
    navReport: 'รายงานหมา',

    signIn: 'เข้าสู่ระบบ',
    signInWithGoogle: 'ดำเนินการต่อด้วย Google',
    signOut: 'ออกจากระบบ',
    signInRequired: 'เข้าสู่ระบบเพื่อรายงานหมา — ดูแผนที่ได้โดยไม่ต้องล็อกอิน',
    signInBlurb: 'เข้าสู่ระบบเพื่อให้รายงานของคุณมีชื่อผู้รายงาน และแก้ไขหมาที่คุณเพิ่มได้',

    mapLocate: 'ค้นหาตำแหน่งของฉัน',
    mapLocateStop: 'หยุดติดตามตำแหน่ง',
    mapLocateDenied: 'ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง',
    mapLocateError: 'ค้นหาตำแหน่งไม่สำเร็จ',
    mapLocateUnsupported: 'อุปกรณ์ไม่รองรับ',
    mapEmptyHint: 'ยังไม่มีรายงานหมาแถวนี้ — เป็นคนแรกสิ!',

    reportTitle: 'รายงานหมา',
    reportTakePhoto: 'ถ่ายหรือเลือกรูปภาพ',
    reportRetake: 'เลือกรูปอื่น',
    reportGettingLocation: 'กำลังหาตำแหน่งของคุณ…',
    reportLocationDenied: 'ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง — จำเป็นต้องใช้เพื่อจับคู่หมาใกล้เคียง',
    reportLocationError: 'หาตำแหน่งไม่สำเร็จ',
    reportUploading: 'กำลังอัปโหลดรูป…',
    reportAnalyzing: 'กำลังดูรูปภาพ…',
    reportUploadError: 'อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง',
    reportSearching: 'กำลังตรวจสอบหมาที่เคยรายงานแถวนี้…',
    reportCandidatesTitle: 'ใช่หมาตัวนี้หรือเปล่า?',
    reportCandidatesHint: 'พบหมา {n} ตัวที่เคยรายงานแถวนี้',
    reportSameDog: 'ใช่ หมาตัวนี้แหละ',
    reportNoCandidates: 'ยังไม่มีหมาที่รายงานแถวนี้',
    reportNotListed: 'ไม่ใช่ตัวไหนเลย — เป็นหมาตัวใหม่',
    reportNameLabel: 'ตั้งชื่อหมาตัวนี้',
    reportNamePlaceholder: 'เช่น สมชาย บราวนี่ ซันนี่',
    reportNoteLabel: 'หมายเหตุ (ไม่บังคับ)',
    reportNotePlaceholder: 'สิ่งที่ควรบอก — เป็นมิตร บาดเจ็บ มีปลอกคอ…',
    reportSubmit: 'ส่งรายงาน',
    reportSubmitting: 'กำลังบันทึก…',
    reportSuccessNew: 'เพิ่มหมาตัวใหม่แล้ว! 🐾',
    reportSuccessMatched: 'เพิ่มการพบเห็นให้ {name} แล้ว',
    reportAnother: 'รายงานอีกครั้ง',
    reportRateLimited: 'คุณรายงานครบโควตาวันนี้แล้ว ลองใหม่พรุ่งนี้',
    distanceAway: 'ห่าง {d} เมตร',

    dogUnnamed: 'หมาไม่มีชื่อ',
    dogLastSeen: 'พบล่าสุด',
    dogSightings: 'ครั้งที่พบเห็น',
    dogReportSighting: 'รายงานการพบเห็นหมาตัวนี้อีกครั้ง',
    dogRename: 'แก้ไขชื่อ',
    dogSave: 'บันทึก',
    dogCancel: 'ยกเลิก',
    dogClose: 'ปิด',
    dogReportedBy: 'รายงานโดย {name}',
  },
}

export function useLangContext() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLangContext must be used within LangContext.Provider')
  return ctx
}

// Simple {placeholder} interpolation, matching the rest of the monorepo's apps.
export function interp(template, vars) {
  if (typeof template !== 'string') return ''
  return Object.entries(vars || {}).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    template,
  )
}
