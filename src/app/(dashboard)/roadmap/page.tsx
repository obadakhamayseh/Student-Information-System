'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { StudyPlanData, PlanCourse } from '@/lib/schemas/plan.schema';
import { exportToCsv } from '@/lib/export-utils';
import { PrintHeader, PrintFooter } from '@/components/print-header';
import {
  generateGraduationRoadmap,
  RoadmapSemester,
  RoadmapConfig,
  DEFAULT_ROADMAP_CONFIG,
  PlannedCourseItem,
  getCourseLevel,
  getCourseDifficulty,
} from '@/lib/roadmap-engine';
import {
  validateCustomPlan,
  CustomPlanValidationResult,
  PlanSuggestion,
  PlanAuditCheck,
} from '@/lib/roadmap-validator';
import {
  getOfficialCreditHours,
  getOfficialCourse,
  getOfficialPrerequisite,
  getOfficialPrerequisiteCode,
  isCourseCorequisite,
  normalizeCourseCode,
} from '@/lib/course-catalog';

export default function GraduationRoadmapPage() {
  const router = useRouter();
  const [planData, setPlanData] = useState<StudyPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active View Mode: 'recommended' (AI generated default) or 'custom' (interactive student builder)
  const [planMode, setPlanMode] = useState<'recommended' | 'custom'>('recommended');

  // Configuration state for recommended roadmap
  const [config, setConfig] = useState<RoadmapConfig>({
    ...DEFAULT_ROADMAP_CONFIG,
    pace: 'balanced',
    includeSummer: true,
    maxRegularHours: 16,
    maxSummerHours: 9,
  });

  // Filter & Search
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAuditPanel, setShowAuditPanel] = useState<boolean>(true);
  const [showAdvisorPanel, setShowAdvisorPanel] = useState<boolean>(true);
  const [showUnassignedDrawer, setShowUnassignedDrawer] = useState<boolean>(false);

  // Customized semesters state (allows adding, removing, shifting courses & semesters)
  const [customSemesters, setCustomSemesters] = useState<RoadmapSemester[] | null>(null);

  // Modal State for adding courses
  const [addCourseModalSemIdx, setAddCourseModalSemIdx] = useState<number | null>(null);
  const [courseModalSearch, setCourseModalSearch] = useState<string>('');
  const [courseModalTab, setCourseModalTab] = useState<'compulsory' | 'elective'>('compulsory');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchPlan = async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/plan${force ? '?refresh=true' : ''}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const json = await res.json();
        setError(json.message || 'تعذر جلب الخطة الدراسية من الخادم');
        return;
      }

      const json: StudyPlanData = await res.json();
      setPlanData(json);
    } catch {
      setError('حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  // Compute the base generated roadmap automatically when planData or config changes
  const baseRoadmap = useMemo(() => {
    if (!planData) return null;
    return generateGraduationRoadmap(planData, config);
  }, [planData, config]);

  // Keep customSemesters in sync with generated roadmap initially
  useEffect(() => {
    if (baseRoadmap && !customSemesters) {
      setCustomSemesters(JSON.parse(JSON.stringify(baseRoadmap.semesters)));
    }
  }, [baseRoadmap, customSemesters]);

  // Active semesters shown based on mode
  const activeSemesters =
    planMode === 'custom' && customSemesters
      ? customSemesters
      : baseRoadmap?.semesters || [];

  // Real-time Academic Validation & AI Advisor result
  const validationResult: CustomPlanValidationResult | null = useMemo(() => {
    if (!planData || !activeSemesters || activeSemesters.length === 0) return null;
    return validateCustomPlan(planData, activeSemesters);
  }, [planData, activeSemesters]);

  // Helper to recalculate workload status of a semester
  const updateSemesterWorkload = (sem: RoadmapSemester) => {
    if (sem.isCurrentSemester) return;
    const hours = sem.courses.reduce((sum, c) => sum + (c.creditHours || 3), 0);
    sem.totalHours = hours;

    if (sem.isGraduationSemester) {
      if (sem.isSummer) {
        if (hours > 10) {
          sem.workloadStatus = 'عبء تخرج صيفي استثنائي (12 س.م)';
          sem.workloadColor = 'purple';
        } else {
          sem.workloadStatus = 'صيفي مركز';
          sem.workloadColor = 'amber';
        }
      } else {
        if (hours > 18) {
          sem.workloadStatus = 'عبء تخرج استثنائي (21 س.م)';
          sem.workloadColor = 'purple';
        } else if (hours === 18) {
          sem.workloadStatus = 'مكثف (الحد الأقصى 18 س.م)';
          sem.workloadColor = 'purple';
        } else if (hours <= 12) {
          sem.workloadStatus = 'خفيف';
          sem.workloadColor = 'emerald';
        } else {
          sem.workloadStatus = 'متوازن ومثالي';
          sem.workloadColor = 'blue';
        }
      }
    } else {
      if (sem.isSummer) {
        sem.workloadStatus = 'صيفي مركز';
        sem.workloadColor = 'amber';
      } else if (hours >= 18) {
        sem.workloadStatus = 'مكثف (الحد الأقصى 18 س.م)';
        sem.workloadColor = 'purple';
      } else if (hours <= 12) {
        sem.workloadStatus = 'خفيف';
        sem.workloadColor = 'emerald';
      } else {
        sem.workloadStatus = 'متوازن ومثالي';
        sem.workloadColor = 'blue';
      }
    }
  };

  // Move course between semesters
  const moveCourseToSemester = (courseNumber: string, sourceSemIdx: number, targetSemIdx: number) => {
    const semestersToUse = customSemesters || baseRoadmap?.semesters;
    if (!semestersToUse) return;
    if (targetSemIdx < 0 || targetSemIdx >= semestersToUse.length) return;

    const targetSem = semestersToUse[targetSemIdx];
    if (targetSem.isCurrentSemester) {
      showToast('لا يمكن نقل مقررات إلى الفصل الحالي (المساقات مسجلة فعلياً بالجامعة)');
      return;
    }

    const newSemesters = semestersToUse.map((s) => ({
      ...s,
      courses: [...s.courses],
    }));

    const sourceCourses = newSemesters[sourceSemIdx].courses;
    const courseIndex = sourceCourses.findIndex((c) => c.courseNumber === courseNumber);
    if (courseIndex === -1) return;

    const movedCourse = sourceCourses[courseIndex];
    sourceCourses.splice(courseIndex, 1);
    newSemesters[targetSemIdx].courses.push(movedCourse);

    updateSemesterWorkload(newSemesters[sourceSemIdx]);
    updateSemesterWorkload(newSemesters[targetSemIdx]);

    setCustomSemesters(newSemesters);
    if (planMode !== 'custom') setPlanMode('custom');
    showToast(`تم نقل "${movedCourse.courseName}" إلى ${newSemesters[targetSemIdx].semesterName}`);
  };

  // Add course to semester
  const handleAddCourseToSemester = (course: PlannedCourseItem, targetSemIdx: number) => {
    const semestersToUse = customSemesters || baseRoadmap?.semesters;
    if (!semestersToUse) return;
    if (targetSemIdx < 0 || targetSemIdx >= semestersToUse.length) return;

    const targetSem = semestersToUse[targetSemIdx];
    if (targetSem.isCurrentSemester) {
      showToast('لا يمكن إضافة مقررات إلى الفصل الحالي (مسجل مسبقاً)');
      return;
    }

    const normCode = normalizeCourseCode(course.courseNumber);

    // Check if course already exists in any future semester
    for (let i = 0; i < semestersToUse.length; i++) {
      if (semestersToUse[i].courses.some((c) => normalizeCourseCode(c.courseNumber) === normCode)) {
        showToast(`المقرر (${course.courseName}) مجدول بالفعل في ${semestersToUse[i].semesterName}`);
        return;
      }
    }

    const newSemesters = semestersToUse.map((s) => ({
      ...s,
      courses: [...s.courses],
    }));

    newSemesters[targetSemIdx].courses.push(course);
    updateSemesterWorkload(newSemesters[targetSemIdx]);

    setCustomSemesters(newSemesters);
    if (planMode !== 'custom') setPlanMode('custom');
    setAddCourseModalSemIdx(null);
    showToast(`تمت إضافة "${course.courseName}" إلى ${newSemesters[targetSemIdx].semesterName}`);
  };

  // Remove course from semester (returns it to the unassigned reservoir)
  const handleRemoveCourseFromSemester = (courseNumber: string, semIdx: number) => {
    const semestersToUse = customSemesters || baseRoadmap?.semesters;
    if (!semestersToUse) return;
    if (semIdx < 0 || semIdx >= semestersToUse.length) return;

    const sem = semestersToUse[semIdx];
    if (sem.isCurrentSemester) {
      showToast('لا يمكن حذف مواد من الفصل الحالي');
      return;
    }

    const newSemesters = semestersToUse.map((s) => ({
      ...s,
      courses: [...s.courses],
    }));

    const idx = newSemesters[semIdx].courses.findIndex((c) => c.courseNumber === courseNumber);
    if (idx === -1) return;

    const removed = newSemesters[semIdx].courses[idx];
    newSemesters[semIdx].courses.splice(idx, 1);
    updateSemesterWorkload(newSemesters[semIdx]);

    setCustomSemesters(newSemesters);
    if (planMode !== 'custom') setPlanMode('custom');
    showToast(`تمت إزالة "${removed.courseName}" من الفصل وحفظها في حوض المواد غير المجدولة`);
  };

  // Add a brand new semester to the custom plan
  const handleAddNewSemester = () => {
    const semestersToUse = customSemesters || baseRoadmap?.semesters;
    if (!semestersToUse || semestersToUse.length === 0) return;

    const lastSem = semestersToUse[semestersToUse.length - 1];
    let nextSemName = '';
    let nextYear = lastSem.academicYear;
    let nextIsSummer = false;

    if (lastSem.semesterName.includes('الأول')) {
      nextSemName = `الفصل الثاني ${lastSem.academicYear}`;
    } else if (lastSem.semesterName.includes('الثاني')) {
      nextSemName = `الفصل الصيفي ${lastSem.academicYear}`;
      nextIsSummer = true;
    } else {
      // After summer, advance to next academic year
      const years = lastSem.academicYear.split('/');
      if (years.length === 2) {
        const y1 = parseInt(years[0], 10) + 1;
        const y2 = parseInt(years[1], 10) + 1;
        nextYear = `${y1}/${y2}`;
      } else {
        nextYear = '2026/2027';
      }
      nextSemName = `الفصل الأول ${nextYear}`;
    }

    const newSem: RoadmapSemester = {
      id: `custom_sem_${Date.now()}`,
      semesterNumber: semestersToUse.length + 1,
      semesterName: nextSemName,
      academicYear: nextYear,
      isSummer: nextIsSummer,
      isGraduationSemester: true,
      targetHours: nextIsSummer ? 9 : 15,
      totalHours: 0,
      courses: [],
      workloadStatus: 'خفيف',
      workloadColor: 'emerald',
    };

    const newSemesters = semestersToUse.map((s, idx) => ({
      ...s,
      isGraduationSemester: false,
    }));

    newSemesters.push(newSem);
    setCustomSemesters(newSemesters);
    if (planMode !== 'custom') setPlanMode('custom');
    showToast(`تمت إضافة فصل دراسي جديد: ${nextSemName}`);
  };

  // Remove empty semester
  const handleRemoveSemester = (semIdx: number) => {
    const semestersToUse = customSemesters || baseRoadmap?.semesters;
    if (!semestersToUse) return;
    if (semIdx <= 0 || semIdx >= semestersToUse.length) return;

    const sem = semestersToUse[semIdx];
    if (sem.isCurrentSemester) {
      showToast('لا يمكن حذف الفصل الحالي');
      return;
    }

    if (sem.courses.length > 0) {
      showToast('يرجى نقل أو حذف المقررات من هذا الفصل أولاً قبل حذفه');
      return;
    }

    if (semestersToUse.length <= 2) {
      showToast('يجب الإبقاء على فصل دراسي واحد على الأقل للتخرج');
      return;
    }

    const newSemesters = semestersToUse.filter((_, idx) => idx !== semIdx);
    // Renumber
    newSemesters.forEach((s, idx) => {
      s.semesterNumber = idx + 1;
      s.isGraduationSemester = idx === newSemesters.length - 1;
    });

    setCustomSemesters(newSemesters);
    if (planMode !== 'custom') setPlanMode('custom');
    showToast(`تم حذف الفصل بنجاح`);
  };

  // Toggle semester summer mode
  const handleToggleSemesterSummer = (semIdx: number) => {
    const semestersToUse = customSemesters || baseRoadmap?.semesters;
    if (!semestersToUse) return;
    if (semIdx < 0 || semIdx >= semestersToUse.length) return;

    const sem = semestersToUse[semIdx];
    if (sem.isCurrentSemester) return;

    const newSemesters = semestersToUse.map((s) => ({
      ...s,
      courses: [...s.courses],
    }));

    const target = newSemesters[semIdx];
    target.isSummer = !target.isSummer;
    if (target.isSummer) {
      target.semesterName = target.semesterName.replace(/الأول|الثاني/g, 'الصيفي');
    } else {
      target.semesterName = target.semesterName.replace('الصيفي', 'الأول');
    }

    updateSemesterWorkload(target);
    setCustomSemesters(newSemesters);
    if (planMode !== 'custom') setPlanMode('custom');
    showToast(`تم تعديل نوع الفصل إلى: ${target.isSummer ? 'فصل صيفي ☀️' : 'فصل عادي 🏛️'}`);
  };

  // Reset custom plan back to recommended plan
  const handleResetToRecommended = () => {
    if (!baseRoadmap) return;
    setCustomSemesters(JSON.parse(JSON.stringify(baseRoadmap.semesters)));
    showToast('تمت استعادة الخطة المقترحة الافتراضية بنجاح 🔄');
  };

  // Apply AI Advisor Suggestion with single click
  const handleApplySuggestion = (suggestion: PlanSuggestion) => {
    const semestersToUse = customSemesters || baseRoadmap?.semesters;
    if (!semestersToUse || !suggestion.suggestedAction) return;
    const action = suggestion.suggestedAction;

    if (action.type === 'move_course' && action.courseNumber) {
      let fromIdx = action.fromSemesterId
        ? semestersToUse.findIndex((s) => s.id === action.fromSemesterId)
        : -1;
      let toIdx = action.toSemesterId
        ? semestersToUse.findIndex((s) => s.id === action.toSemesterId)
        : -1;

      if (fromIdx === -1 && action.fromSemesterIndex !== undefined) {
        fromIdx = action.fromSemesterIndex + (semestersToUse[0]?.isCurrentSemester ? 1 : 0);
      }
      if (toIdx === -1 && action.toSemesterIndex !== undefined) {
        toIdx = action.toSemesterIndex + (semestersToUse[0]?.isCurrentSemester ? 1 : 0);
      }

      if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
        moveCourseToSemester(action.courseNumber, fromIdx, toIdx);
        showToast(`تم تطبيق الاقتراح: ${suggestion.title}`);
      }
    } else if (action.type === 'add_course' && action.courseNumber) {
      let toIdx = action.toSemesterId
        ? semestersToUse.findIndex((s) => s.id === action.toSemesterId)
        : -1;
      if (toIdx === -1 && action.toSemesterIndex !== undefined) {
        toIdx = action.toSemesterIndex + (semestersToUse[0]?.isCurrentSemester ? 1 : 0);
      }

      if (toIdx >= 0 && toIdx < semestersToUse.length) {
        const normCode = normalizeCourseCode(action.courseNumber);
        const unassigned = validationResult?.unassignedCompulsoryCourses.find(
          (c) => normalizeCourseCode(c.courseNumber) === normCode
        );
        const elective = validationResult?.availableElectivePool.find(
          (c) => normalizeCourseCode(c.courseNumber) === normCode
        );
        const catalogEntry = getOfficialCourse(action.courseNumber);

        const courseName = catalogEntry?.courseName || action.courseNumber;
        const category = catalogEntry?.category || 'متطلب خطة';
        const level = getCourseLevel(action.courseNumber, courseName);
        const difficulty = getCourseDifficulty(level, category, courseName);

        const courseToAdd: PlannedCourseItem = unassigned || elective || {
          courseNumber: action.courseNumber,
          courseName,
          creditHours: catalogEntry?.creditHours || 3,
          status: 'متبقية',
          category,
          level,
          difficulty,
          reason: 'إضافة مقترحة من المرشد الأكاديمي',
          prerequisite: catalogEntry?.prerequisite || '—',
        };

        handleAddCourseToSemester(courseToAdd, toIdx);
        showToast(`تم تطبيق الاقتراح: إضافة ${courseToAdd.courseName}`);
      }
    } else if (action.type === 'remove_course' && action.courseNumber) {
      let fromIdx = action.fromSemesterId
        ? semestersToUse.findIndex((s) => s.id === action.fromSemesterId)
        : -1;
      if (fromIdx === -1 && action.fromSemesterIndex !== undefined) {
        fromIdx = action.fromSemesterIndex + (semestersToUse[0]?.isCurrentSemester ? 1 : 0);
      }
      if (fromIdx >= 0) {
        handleRemoveCourseFromSemester(action.courseNumber, fromIdx);
      }
    }
  };

  const handlePaceChange = (pace: 'balanced' | 'fast' | 'light') => {
    const maxReg = pace === 'fast' ? 18 : pace === 'light' ? 14 : 16;
    setConfig((prev) => ({
      ...prev,
      pace,
      maxRegularHours: maxReg,
    }));
    showToast(
      pace === 'fast'
        ? 'تم تفعيل مسار الحد الأقصى العادي (18 س.م لكل فصل، وحتى 21 س.م لفصل التخرج)'
        : pace === 'light'
        ? 'تم تفعيل مسار التخفيف (12-14 س.م لكل فصل)'
        : 'تم تفعيل مسار التوازن الأكاديمي (15-16 س.م لكل فصل)'
    );
  };

  const toggleSummer = () => {
    setConfig((prev) => ({
      ...prev,
      includeSummer: !prev.includeSummer,
    }));
    showToast(
      config.includeSummer
        ? 'تم استبعاد الفصول الصيفية من مسار التخرج'
        : 'تم تضمين الفصول الصيفية لتسريع موعد التخرج'
    );
  };

  const handleCopyCourseCode = (code: string, name: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      showToast(`تم نسخ رقم المقرر (${code}) - ${name}`);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleExportRoadmapCsv = () => {
    if (!activeSemesters || activeSemesters.length === 0) return;

    const headers = [
      'رقم الفصل',
      'اسم الفصل الدراسي',
      'السنة الأكاديمية',
      'نوع الفصل',
      'رقم المقرر',
      'اسم المقرر',
      'الساعات المعتمدة',
      'المستوى',
      'تصنيف المساق',
      'سبب الإدراج الأكاديمي',
    ];

    const rows: (string | number)[][] = [];
    activeSemesters.forEach((sem) => {
      sem.courses.forEach((c) => {
        rows.push([
          sem.semesterNumber,
          sem.semesterName,
          sem.academicYear,
          sem.isSummer ? 'صيفي' : 'نظامي',
          c.courseNumber,
          c.courseName,
          c.creditHours || 3,
          c.level ? `سنة ${c.level}` : '—',
          c.category || 'متطلب خطة',
          c.reason || '—',
        ]);
      });
    });

    const filename = `خريطة_التخرج_${planData?.majorName || 'جامعة_مؤتة'}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    exportToCsv(filename, headers, rows);
    showToast('تم تصدير خريطة التخرج بنجاح إلى ملف Excel / CSV');
  };

  if (loading) {
    return (
      <div className="flex flex-col w-full gap-space-lg animate-pulse">
        <div className="h-44 bg-surface-container-low rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-surface-container-low rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-surface-container-low rounded-2xl" />
      </div>
    );
  }

  if (error && !planData) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="bg-error-container/40 border border-error/30 rounded-2xl p-space-xl text-on-surface">
          <span className="material-symbols-outlined text-5xl text-error mb-3">warning</span>
          <h2 className="text-lg font-bold text-primary mb-2">تعذر إنشاء خريطة التخرج</h2>
          <p className="text-xs text-on-surface-variant mb-6">{error}</p>
          <button
            onClick={() => fetchPlan(true)}
            className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 hover:bg-primary-container cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  const completedHours = baseRoadmap?.completedHours || 0;
  const currentRegisteredHours = baseRoadmap?.currentRegisteredHours || 0;
  const remainingHours =
    validationResult?.totalScheduledRemainingHours ?? (baseRoadmap?.totalRemainingHours || 0);
  const totalDegreeHours = baseRoadmap?.totalDegreeHours || 132;
  const progressPercent = Math.min(
    100,
    Math.round(((completedHours + currentRegisteredHours) / totalDegreeHours) * 100)
  );

  const futureSemesters = activeSemesters.filter((s) => !s.isCurrentSemester);
  const futureSemestersCount = futureSemesters.length || 2;
  const lastFutureSemester = futureSemesters[futureSemesters.length - 1];
  const estimatedGraduationSemester =
    lastFutureSemester?.semesterName || baseRoadmap?.estimatedGraduationSemester || '—';

  // Compute completed courses prior to the modal's target semester for real-time eligibility preview
  const modalTargetSem =
    addCourseModalSemIdx !== null ? activeSemesters[addCourseModalSemIdx] : null;

  const officiallyCompletedCodesForModal = new Set<string>();
  const currentlyEnrolledCodesForModal = new Set<string>();
  const earlierScheduledCodesForModal = new Set<string>();

  if (planData?.courses) {
    planData.courses.forEach((c) => {
      if (c.status === 'منجزة') {
        officiallyCompletedCodesForModal.add(normalizeCourseCode(c.courseNumber));
      } else if (c.status === 'مسجلة') {
        currentlyEnrolledCodesForModal.add(normalizeCourseCode(c.courseNumber));
      }
    });
  }
  officiallyCompletedCodesForModal.add('1801096');
  officiallyCompletedCodesForModal.add('1802096');
  officiallyCompletedCodesForModal.add('2200096');
  officiallyCompletedCodesForModal.add('2200099');

  if (addCourseModalSemIdx !== null) {
    for (let i = 0; i < addCourseModalSemIdx; i++) {
      if (!activeSemesters[i].isCurrentSemester) {
        activeSemesters[i].courses.forEach((c) => {
          earlierScheduledCodesForModal.add(normalizeCourseCode(c.courseNumber));
        });
      }
    }
  }

  // All courses currently scheduled across any future semester
  const allScheduledCodes = new Set<string>();
  activeSemesters.forEach((s) => {
    s.courses.forEach((c) => {
      allScheduledCodes.add(normalizeCourseCode(c.courseNumber));
    });
  });

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Official Print Header */}
      <PrintHeader
        documentTitle="خريطة التخرج ومسار الفصول المقترحة"
        studentName={planData?.studentName}
        studentId={planData?.studentId}
        major={planData?.majorName}
        academicYear={estimatedGraduationSemester}
        extraStats={[
          { label: 'الساعات المنجزة سابقاً', value: `${completedHours} س.م` },
          { label: 'الساعات المسجلة حالياً (تم تنزيلها)', value: `${currentRegisteredHours} س.م` },
          { label: 'الساعات المتبقية للتسجيل (تريد تنزيلها)', value: `${remainingHours} س.م` },
          { label: 'المجموع الكلي المعتمد', value: `${totalDegreeHours} س.م` },
        ]}
      />

      {/* 1. Header Banner & Context */}
      <div className="w-full bg-gradient-to-l from-primary via-primary-container to-slate-900 text-on-primary rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden mb-space-lg border border-white/10 no-print">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-secondary-container/30 text-secondary-container px-3 py-1 rounded-full font-label-sm text-xs font-bold flex items-center gap-1.5 border border-secondary-container/20">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                المرشد الأكاديمي ومحرك التخصيص الذكي (Custom Plan Engine)
              </span>
              <span className="bg-white/10 text-white/90 px-3 py-1 rounded-full font-label-sm text-xs">
                {planData?.majorName || 'الخطة الأكاديمية'}
              </span>
              {planData?.planYear && (
                <span className="bg-white/10 text-white/90 px-3 py-1 rounded-full font-label-sm text-xs">
                  خطة سنة {planData.planYear}
                </span>
              )}
            </div>

            <h1 className="font-headline-xl text-2xl sm:text-headline-xl font-bold tracking-tight text-white">
              خريطة التخرج ومسار الفصول المقترحة
            </h1>
            <p className="font-body-md text-on-primary-container max-w-2xl text-xs sm:text-sm leading-relaxed">
              اختر مسارك المقترح من الذكاء الاصطناعي أو خصّص خطتك بنفسك بحرية كاملة مع فحص دقيق وفوري
              لصحة اختياراتك، أسبقيات المواد، وسقوف الساعات المعتمدة بجامعة مؤتة.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => fetchPlan(true)}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-base ${refreshing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{refreshing ? 'جاري التحديث...' : 'تحديث المسار'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-secondary text-on-secondary hover:bg-secondary/90 text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
              title="طباعة خريطة التخرج أو حفظها كـ PDF"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>طباعة / حفظ PDF</span>
            </button>
            <button
              onClick={handleExportRoadmapCsv}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
              title="تصدير مسار التخرج والفصول المقترحة إلى ملف Excel / CSV"
            >
              <span className="material-symbols-outlined text-base text-secondary-container">
                table_view
              </span>
              <span>تصدير Excel</span>
            </button>
            <Link
              href="/plan"
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">account_tree</span>
              <span>الخطة الشجرية</span>
            </Link>
          </div>
        </div>

        {/* Decorative background watermark */}
        <div className="absolute -left-10 -bottom-10 opacity-10 pointer-events-none select-none text-white">
          <span className="material-symbols-outlined text-[200px]">route</span>
        </div>
      </div>

      {/* 2. Mode Selector: Recommended vs. Custom Mode */}
      <div className="bg-surface-container-lowest rounded-2xl p-3 sm:p-4 shadow-sm border border-surface-container-high/60 mb-space-lg no-print">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setPlanMode('recommended')}
              className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                planMode === 'recommended'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-base text-secondary-container">
                auto_awesome
              </span>
              <span>مسار الذكاء الاصطناعي المقترح</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
                افتراضي
              </span>
            </button>

            <button
              onClick={() => {
                setPlanMode('custom');
                if (!customSemesters && baseRoadmap) {
                  setCustomSemesters(JSON.parse(JSON.stringify(baseRoadmap.semesters)));
                }
              }}
              className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                planMode === 'custom'
                  ? 'bg-secondary text-on-secondary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-secondary hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-base">dashboard_customize</span>
              <span>تخصيص الخطة ومسار الفصول (Custom Plan)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-mono font-bold animate-pulse">
                تخصيص حر 🎯
              </span>
            </button>
          </div>

          {/* Quick controls on the right */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {planMode === 'custom' && (
              <>
                <button
                  onClick={handleAddNewSemester}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary transition-all flex items-center gap-1.5 cursor-pointer border border-primary/20"
                  title="إضافة فصل دراسي جديد لتوزيع المقررات"
                >
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  <span>+ إضافة فصل دراسي جديد</span>
                </button>
                <button
                  onClick={handleResetToRecommended}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all flex items-center gap-1.5 cursor-pointer"
                  title="استعادة الخطة المقترحة بالكامل"
                >
                  <span className="material-symbols-outlined text-base">restart_alt</span>
                  <span>استعادة المقترح</span>
                </button>
              </>
            )}

            {planMode === 'recommended' && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Pace Buttons */}
                <div className="bg-surface-container-low p-1 rounded-xl flex items-center gap-1 border border-surface-container-high/40">
                  <button
                    onClick={() => handlePaceChange('fast')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      config.pace === 'fast'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    <span>⚡</span>
                    <span>18 س.م</span>
                  </button>
                  <button
                    onClick={() => handlePaceChange('balanced')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      config.pace === 'balanced'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    <span>⚖️</span>
                    <span>متوازن</span>
                  </button>
                  <button
                    onClick={() => handlePaceChange('light')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      config.pace === 'light'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    <span>🌿</span>
                    <span>مخفف</span>
                  </button>
                </div>

                {/* Summer Toggle */}
                <button
                  onClick={toggleSummer}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer border ${
                    config.includeSummer
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                      : 'bg-surface-container-low border-surface-container-high text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-base text-amber-600">
                    {config.includeSummer ? 'wb_sunny' : 'nightlight'}
                  </span>
                  <span>{config.includeSummer ? 'صيفي: مفعّل' : 'صيفي: مستبعد'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. AI Academic Soundness & Validation Dashboard (نسبة الدقة، هل اختياري سليم، ومستشار التخرج) */}
      {validationResult && (
        <div className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-sm border border-surface-container-high/60 mb-space-lg no-print">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-5 border-b border-surface-container-high/40">
            {/* Left/Main Score Gauge */}
            <div className="flex items-center gap-5">
              <div className="relative flex items-center justify-center">
                <div
                  className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-extrabold shadow-sm border-2 ${
                    validationResult.score >= 90
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/20'
                      : validationResult.score >= 75
                      ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/20'
                      : validationResult.score >= 50
                      ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/20'
                      : 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/20'
                  }`}
                >
                  <span className="text-2xl font-mono leading-none">{validationResult.score}%</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider mt-1">نسبة الدقة</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 ${
                      validationResult.color === 'emerald'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : validationResult.color === 'blue'
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : validationResult.color === 'amber'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {validationResult.isValid ? 'verified' : 'crisis_alert'}
                    </span>
                    <span>{validationResult.rating}</span>
                  </span>

                  <span className="text-xs font-medium text-on-surface-variant">
                    {planMode === 'custom'
                      ? 'تقييم فوري لخطتك المخصصة'
                      : 'تقييم المسار المقترح من الذكاء الاصطناعي'}
                  </span>
                </div>

                <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface">
                  {validationResult.isValid
                    ? 'اختيارك سليم ومتوافق أكاديمياً مع متطلبات جامعة مؤتة'
                    : 'يوجد ملاحظات أو تعارضات تحتاج إلى مراجعة وتعديل'}
                </h3>

                <p className="text-xs text-on-surface-variant leading-relaxed">
                  فحص تلقائي للأسبقيات، سقوف الساعات (18/21 عادي، 10/12 صيفي)، وتسكين 4 ساعات اختياري
                  تخصص دون زيادة أو نقصان.
                </p>
              </div>
            </div>

            {/* Checklist Badges & Counters */}
            <div className="flex items-center gap-2 flex-wrap self-stretch lg:self-auto justify-start lg:justify-end">
              <div className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex items-center gap-2 text-xs">
                <span className="material-symbols-outlined text-emerald-600 text-base">
                  check_circle
                </span>
                <span>
                  مستوفاة: <strong className="text-emerald-700">{validationResult.passCount}</strong>
                </span>
              </div>

              {validationResult.warningCount > 0 && (
                <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-900">
                  <span className="material-symbols-outlined text-amber-600 text-base">warning</span>
                  <span>
                    تنبيهات: <strong>{validationResult.warningCount}</strong>
                  </span>
                </div>
              )}

              {validationResult.errorCount > 0 && (
                <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-900">
                  <span className="material-symbols-outlined text-rose-600 text-base">error</span>
                  <span>
                    تعارضات: <strong>{validationResult.errorCount}</strong>
                  </span>
                </div>
              )}

              <button
                onClick={() => setShowAdvisorPanel(!showAdvisorPanel)}
                className="px-3.5 py-2 rounded-xl bg-secondary/10 hover:bg-secondary/20 text-secondary text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer border border-secondary/20"
              >
                <span className="material-symbols-outlined text-base">
                  {showAdvisorPanel ? 'expand_less' : 'expand_more'}
                </span>
                <span>{showAdvisorPanel ? 'إخفاء الاقتراحات' : 'عرض الاقتراحات الأفضل'}</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
            <div className="p-2.5 rounded-xl bg-surface-container-low/60 flex flex-col gap-0.5">
              <span className="text-on-surface-variant text-[11px]">المجموع الكلي المجدول</span>
              <span className="font-bold text-primary font-mono text-sm">
                {validationResult.totalDegreeScheduledHours} / {totalDegreeHours} س.م
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-container-low/60 flex flex-col gap-0.5">
              <span className="text-on-surface-variant text-[11px]">ساعات التخصص الاختيارية</span>
              <span className="font-bold text-primary font-mono text-sm flex items-center gap-1">
                {validationResult.majorElectiveHoursScheduled} /{' '}
                {validationResult.majorElectiveHoursTarget} س.م
                {validationResult.majorElectiveHoursScheduled ===
                validationResult.majorElectiveHoursTarget ? (
                  <span className="text-emerald-600 text-[11px]">✓ مضبوطة</span>
                ) : (
                  <span className="text-amber-600 text-[11px]">بحاجة لضبط</span>
                )}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-container-low/60 flex flex-col gap-0.5">
              <span className="text-on-surface-variant text-[11px]">المواد الإجبارية المتبقية</span>
              <span className="font-bold text-primary font-mono text-sm flex items-center gap-1">
                {validationResult.unassignedCompulsoryCourses.length === 0 ? (
                  <span className="text-emerald-600 font-bold">مسكنة بالكامل ✓</span>
                ) : (
                  <span className="text-amber-600 font-bold">
                    {validationResult.unassignedCompulsoryCourses.length} مواد بانتظار التسكين
                  </span>
                )}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-container-low/60 flex flex-col gap-0.5">
              <span className="text-on-surface-variant text-[11px]">الفصول القادمة المجدولة</span>
              <span className="font-bold text-secondary font-mono text-sm">
                {futureSemestersCount} فصول ({remainingHours} س.م)
              </span>
            </div>
          </div>

          {/* Smart Suggestions & One-Click Fixes Panel */}
          {showAdvisorPanel && (
            <div className="mt-5 pt-5 border-t border-surface-container-high/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-lg">
                    psychology_alt
                  </span>
                  <h4 className="font-bold text-xs sm:text-sm text-primary">
                    اقتراحات مستشار التخرج الذكي (Smart AI Suggestions):
                  </h4>
                </div>
                <span className="text-[11px] text-on-surface-variant">
                  {validationResult.suggestions.length} توصيات مقترحة
                </span>
              </div>

              {validationResult.suggestions.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-900 text-xs flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl text-emerald-600">
                    sentiment_very_satisfied
                  </span>
                  <div className="leading-relaxed">
                    <strong>رائع جداً! لا توجد أي ملاحظات أو تعارضات.</strong> خطتك الحالية ممتازة
                    وتحقق جميع متطلبات التخرج بنجاح وتوازن تام.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {validationResult.suggestions.map((sug) => {
                    const isCritical = sug.severity === 'critical';
                    const isWarning = sug.severity === 'warning';

                    return (
                      <div
                        key={sug.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                          isCritical
                            ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                            : isWarning
                            ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                            : 'bg-blue-50/40 border-blue-200 text-blue-950'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-xs flex items-center gap-1.5">
                              <span
                                className={`material-symbols-outlined text-base ${
                                  isCritical
                                    ? 'text-rose-600'
                                    : isWarning
                                    ? 'text-amber-600'
                                    : 'text-blue-600'
                                }`}
                              >
                                {isCritical
                                  ? 'error'
                                  : isWarning
                                  ? 'warning'
                                  : 'tips_and_updates'}
                              </span>
                              <span>{sug.title}</span>
                            </span>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isCritical
                                  ? 'bg-rose-200 text-rose-900'
                                  : isWarning
                                  ? 'bg-amber-200 text-amber-900'
                                  : 'bg-blue-200 text-blue-900'
                              }`}
                            >
                              {isCritical ? 'تعارض حرج' : isWarning ? 'تنبيه' : 'نصيحة'}
                            </span>
                          </div>

                          <p className="text-[11px] text-on-surface-variant leading-relaxed">
                            {sug.description}
                          </p>
                        </div>

                        {sug.suggestedAction && sug.actionText && (
                          <div className="pt-2 border-t border-black/5 flex justify-end">
                            <button
                              onClick={() => handleApplySuggestion(sug)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs ${
                                isCritical
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                  : isWarning
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : 'bg-primary hover:bg-primary-container text-white'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">flash_on</span>
                              <span>تطبيق الحل فوراً: {sug.actionText}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-lg">
        {/* Card 1: Remaining Hours */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container-high/40 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs font-semibold text-on-surface-variant">
              الساعات المتبقية للتسجيل (المواد المطلوبة)
            </span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">hourglass_bottom</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-xl text-3xl font-extrabold text-primary">
                {remainingHours}
              </span>
              <span className="text-xs text-on-surface-variant font-medium">ساعة للتسجيل</span>
            </div>
            <div className="w-full bg-surface-container h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex flex-col gap-0.5 text-[11px] text-on-surface-variant mt-2 leading-relaxed">
              <span className="font-medium text-primary">
                أنجزت {completedHours} س.م • مسجل حالياً {currentRegisteredHours} س.م (تم تنزيلها)
              </span>
              <span>
                المتبقي بعد الحالي: <strong>{remainingHours} س.م</strong> • المجموع الكلي:{' '}
                <strong>{totalDegreeHours} س.م</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Semesters Needed */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container-high/40 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs font-semibold text-on-surface-variant">
              الفصول المتبقية للتخرج
            </span>
            <div className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">calendar_view_week</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-xl text-3xl font-extrabold text-secondary">
                {futureSemestersCount}
              </span>
              <span className="text-xs text-on-surface-variant font-medium">فصول قادمة</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
              {futureSemestersCount} فصول دراسية للتخرج ({remainingHours} س.م موزعة) • بالإضافة للفصل
              الحالي ({currentRegisteredHours} س.م قيد الدراسة)
            </p>
          </div>
        </div>

        {/* Card 3: Target Graduation Term */}
        <div className="bg-gradient-to-br from-secondary/10 to-secondary-container/20 rounded-xl p-5 shadow-sm border border-secondary/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs font-semibold text-secondary">
              موعد التخرج التقديري
            </span>
            <span className="material-symbols-outlined text-2xl text-secondary">school</span>
          </div>
          <div className="mt-2">
            <span className="font-headline-sm text-base sm:text-headline-sm font-extrabold text-primary block leading-tight">
              {estimatedGraduationSemester}
            </span>
            <span className="inline-block mt-2 px-2 py-0.5 bg-secondary text-on-secondary rounded text-[11px] font-bold">
              فصل إنهاء متطلبات الدرجة 🎓
            </span>
          </div>
        </div>

        {/* Card 4: Load Balance & Quality Score */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container-high/40 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs font-semibold text-on-surface-variant">
              مؤشر دقة وتطابق الخطة
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">verified</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-xl text-3xl font-extrabold text-emerald-600">
                {validationResult?.score ?? 100}%
              </span>
              <span className="text-xs text-emerald-700 font-bold">
                {validationResult?.isValid ? 'تطابق رياضي تام' : 'تنبيهات تدقيق'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">
              {completedHours} منجزة + {currentRegisteredHours} تم تنزيلها + {remainingHours} تريد
              تنزيلها = {completedHours + currentRegisteredHours + remainingHours} س.م
            </p>
          </div>
        </div>
      </div>

      {/* 5. Unassigned Courses Reservoir (حوض المساقات غير المجدولة وبنك الاختياري) */}
      {validationResult && (
        <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-surface-container-high/60 mb-space-lg no-print">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">inventory_2</span>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-primary">
                  حوض المساقات غير المجدولة وبنك المقررات المتاحة:
                </h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  مقررات إجبارية بانتظار التسكين (
                  {validationResult.unassignedCompulsoryCourses.length}) • بنك المواد الاختيارية
                  للتخصص ({validationResult.availableElectivePool.length} مواد لاختيار 4 س.م)
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowUnassignedDrawer(!showUnassignedDrawer)}
              className="text-xs font-bold text-primary hover:text-secondary inline-flex items-center gap-1 cursor-pointer transition-colors py-1.5 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-base">
                {showUnassignedDrawer ? 'expand_less' : 'expand_more'}
              </span>
              <span>
                {showUnassignedDrawer ? 'إخفاء حوض المواد' : 'عرض المواد وإضافتها إلى الفصول'}
              </span>
            </button>
          </div>

          {showUnassignedDrawer && (
            <div className="mt-4 pt-4 border-t border-surface-container-high/40 space-y-4">
              {/* Compulsory Unassigned */}
              {validationResult.unassignedCompulsoryCourses.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h4 className="font-bold text-xs text-amber-900 dark:text-amber-300">
                      مقررات إجبارية غير مسكنة بعد ({validationResult.unassignedCompulsoryCourses.length} مواد):
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {validationResult.unassignedCompulsoryCourses.map((c) => (
                      <div
                        key={c.courseNumber}
                        className="p-3 rounded-xl border border-amber-300 bg-amber-50/50 flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded">
                            {c.courseNumber}
                          </span>
                          <h5 className="font-bold text-xs text-primary mt-1 leading-tight">
                            {c.courseName}
                          </h5>
                          <span className="text-[10px] text-on-surface-variant block mt-0.5">
                            {c.creditHours} س.م • {c.category}
                          </span>
                        </div>

                        {futureSemesters.length > 0 && (
                          <div className="shrink-0 flex flex-col gap-1">
                            <button
                              onClick={() => {
                                const targetIdx = activeSemesters.findIndex(
                                  (s) => !s.isCurrentSemester
                                );
                                if (targetIdx >= 0) handleAddCourseToSemester(c, targetIdx);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary text-on-primary hover:bg-primary-container transition-all cursor-pointer shadow-2xs"
                              title="إضافة لأول فصل قادم"
                            >
                              + تسكين
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Elective Pool */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h4 className="font-bold text-xs text-primary">
                      بنك المواد الاختيارية للتخصص (المطلوب إجمالياً 4 س.م):
                    </h4>
                  </div>
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    المجدول حالياً: {validationResult.majorElectiveHoursScheduled} / 4 س.م
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {validationResult.availableElectivePool
                    .filter((c) => !allScheduledCodes.has(normalizeCourseCode(c.courseNumber)))
                    .map((c) => (
                      <div
                        key={c.courseNumber}
                        className="p-3 rounded-xl border border-surface-container-high bg-surface-container-lowest flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant">
                              {c.courseNumber}
                            </span>
                            <span className="text-[10px] font-bold text-secondary font-mono">
                              {c.creditHours} س.م
                            </span>
                          </div>
                          <h5 className="font-bold text-xs text-primary mt-1 leading-tight line-clamp-1">
                            {c.courseName}
                          </h5>
                          {c.prerequisite && c.prerequisite !== '—' && (
                            <span className="text-[10px] text-on-surface-variant block mt-0.5 line-clamp-1">
                              المتطلب: {c.prerequisite}
                            </span>
                          )}
                        </div>

                        {futureSemesters.length > 0 && (
                          <button
                            onClick={() => {
                              const targetIdx = activeSemesters.findIndex(
                                (s) => !s.isCurrentSemester
                              );
                              if (targetIdx >= 0) handleAddCourseToSemester(c, targetIdx);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-secondary text-on-secondary hover:bg-secondary/90 transition-all cursor-pointer shadow-2xs shrink-0"
                            title="إضافة هذا المقرر الاختياري"
                          >
                            + اختيار
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Academic Plan Categories Audit (تدقيق متطلبات الخطة الأكاديمية) */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container-high/50 mb-space-lg">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h3 className="font-headline-sm text-sm sm:text-headline-sm text-primary font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">fact_check</span>
              <span>تدقيق تصنيفات متطلبات الخطة الأكاديمية (Degree Requirements Audit)</span>
            </h3>
            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
              مبني بدقة 100% على شجرة خطتك الرسمية بجامعة مؤتة • متطلب 00 منجز بالكامل • تم ضبط
              الساعات الاختيارية دون زيادة
            </p>
          </div>

          <button
            onClick={() => setShowAuditPanel(!showAuditPanel)}
            className="text-xs font-bold text-primary hover:text-secondary inline-flex items-center gap-1 cursor-pointer transition-colors py-1.5 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-base">
              {showAuditPanel ? 'expand_less' : 'expand_more'}
            </span>
            <span>{showAuditPanel ? 'إخفاء جدول التدقيق' : 'عرض جدول التدقيق الكامل'}</span>
          </button>
        </div>

        {/* Categories Strip Cards */}
        {showAuditPanel && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
            {baseRoadmap?.categoriesSummary.map((cat) => {
              const isDone = cat.status === 'مكتمل';

              return (
                <div
                  key={cat.categoryId || cat.name}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                    isDone
                      ? 'bg-emerald-50/40 border-emerald-200/80 dark:bg-emerald-950/10'
                      : 'bg-surface-container-lowest border-surface-container-high/60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-label-md text-xs font-bold text-on-surface line-clamp-1">
                        {cat.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {cat.status}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
                      <span>المطلوب: {cat.requiredHours} س.م</span>
                      <span>المنجز: {cat.completedHours} س.م</span>
                      {cat.enrolledHours > 0 && (
                        <span className="text-blue-700 font-bold">
                          قيد الدراسة: {cat.enrolledHours} س.م
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-surface-container h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDone ? 'bg-emerald-600' : 'bg-primary'
                        }`}
                        style={{
                          width: `${
                            cat.requiredHours > 0
                              ? Math.min(
                                  100,
                                  Math.round((cat.completedHours / cat.requiredHours) * 100)
                                )
                              : 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-surface-container-high/40 flex items-center justify-between text-[11px]">
                    <span className="text-on-surface-variant">
                      المتبقي المطلوب:{' '}
                      <strong className="text-primary">{cat.remainingHours} س.م</strong>
                    </span>
                    {cat.name.includes('00') && (
                      <span className="text-[10px] text-emerald-700 font-bold">
                        معفى / منجز ✓
                      </span>
                    )}
                    {cat.isElective && (
                      <span className="text-[10px] text-amber-800 font-medium">
                        المطلوب {cat.requiredHours} س.م فقط من حوض المواد
                      </span>
                    )}
                    {cat.isRemedial && (
                      <span className="text-[10px] text-amber-800 font-medium">
                        أولوية فصل 1
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-surface-container-high/40 text-xs">
          <span className="font-bold text-on-surface-variant text-[11px] ml-1">تصفية العرض:</span>
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategoryFilter === 'all'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
            }`}
          >
            الكل ({remainingHours} س.م)
          </button>
          <button
            onClick={() => setSelectedCategoryFilter('major_comp')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategoryFilter === 'major_comp'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
            }`}
          >
            تخصص إجباري ({baseRoadmap?.stats.majorCompulsoryRemaining || 0} س.م)
          </button>
          <button
            onClick={() => setSelectedCategoryFilter('major_elec')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategoryFilter === 'major_elec'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
            }`}
          >
            تخصص اختياري ({baseRoadmap?.stats.majorElectiveRemaining || 0} س.م)
          </button>
          {baseRoadmap && baseRoadmap.stats.collegeCompulsoryRemaining > 0 && (
            <button
              onClick={() => setSelectedCategoryFilter('college_comp')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategoryFilter === 'college_comp'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
              }`}
            >
              كلية إجباري ({baseRoadmap.stats.collegeCompulsoryRemaining} س.م)
            </button>
          )}
          <button
            onClick={() => setSelectedCategoryFilter('uni_comp')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategoryFilter === 'uni_comp'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
            }`}
          >
            جامعة إجباري ({baseRoadmap?.stats.uniCompulsoryRemaining || 0} س.م)
          </button>
        </div>
      </div>

      {/* 7. Main Semesters Roadmap Track */}
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary" />
            <h3 className="font-headline-md text-lg sm:text-headline-md text-primary font-bold">
              {planMode === 'custom'
                ? 'مسار خطتي المخصصة (Custom Graduation Pathway)'
                : 'المسار الزمني المجدول للفصول الدراسية القادمة'}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
            <span>
              إجمالي {futureSemestersCount} فصول متبقية ({remainingHours} ساعة موزعة) • بالإضافة
              للفصل الحالي ({currentRegisteredHours} س.م)
            </span>
          </div>
        </div>

        {activeSemesters.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-surface-container-high/40">
            <span className="material-symbols-outlined text-6xl text-secondary mb-3">school</span>
            <h4 className="font-headline-md text-xl font-bold text-primary">تهانينا! لا توجد مواد متبقية</h4>
            <p className="text-sm text-on-surface-variant mt-2 max-w-md mx-auto">
              لقد أتممت بنجاح جميع متطلبات التخرج وساعات الخطة الدراسية المقررة لك.
            </p>
          </div>
        ) : (
          activeSemesters.map((sem, semIdx) => {
            const isLast = semIdx === activeSemesters.length - 1;
            const workload = validationResult?.semesterWorkloadMap[sem.id];
            const maxAllowed = sem.isGraduationSemester
              ? sem.isSummer
                ? 12
                : 21
              : sem.isSummer
              ? 10
              : 18;

            return (
              <div
                key={sem.id}
                className={`bg-surface-container-lowest rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden ${
                  sem.isGraduationSemester
                    ? 'border-2 border-secondary ring-4 ring-secondary/10'
                    : sem.isCurrentSemester
                    ? 'border-2 border-blue-500/60 ring-4 ring-blue-500/10'
                    : workload?.isOverloaded
                    ? 'border-2 border-rose-500/80 ring-4 ring-rose-500/10'
                    : 'border-surface-container-high/60 hover:border-primary/40'
                }`}
              >
                {/* Semester Header */}
                <div
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${
                    sem.isGraduationSemester
                      ? 'bg-gradient-to-l from-secondary/15 via-secondary/5 to-transparent border-secondary/30'
                      : sem.isCurrentSemester
                      ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/60'
                      : sem.isSummer
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/50'
                      : workload?.isOverloaded
                      ? 'bg-rose-50/70 border-rose-200'
                      : 'bg-surface-container-low/50 border-surface-container-high/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                        sem.isGraduationSemester
                          ? 'bg-secondary text-on-secondary'
                          : sem.isCurrentSemester
                          ? 'bg-blue-600 text-white'
                          : sem.isSummer
                          ? 'bg-amber-500 text-white'
                          : 'bg-primary text-on-primary'
                      }`}
                    >
                      {sem.semesterNumber}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface">
                          {sem.semesterName}
                        </h4>

                        {sem.isCurrentSemester && (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 font-label-sm text-xs font-extrabold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-blue-700">
                              pending_actions
                            </span>
                            الفصل الحالي (قيد الدراسة) ⏳
                          </span>
                        )}

                        {sem.isGraduationSemester && (
                          <>
                            <span className="px-2.5 py-0.5 rounded-full bg-secondary text-on-secondary font-label-sm text-xs font-extrabold flex items-center gap-1 animate-pulse">
                              <span className="material-symbols-outlined text-xs">school</span>
                              فصل التخرج الرسمي 🎓
                            </span>
                            {!sem.isSummer ? (
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-bold">
                                مسموح حتى 21 س.م (عبء خريج)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-bold">
                                مسموح حتى 12 س.م (خريج بالصيفي)
                              </span>
                            )}
                          </>
                        )}

                        {sem.isSummer && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] font-bold">
                            فصل صيفي
                          </span>
                        )}
                      </div>

                      <span className="font-label-sm text-xs text-on-surface-variant block mt-0.5">
                        {sem.isCurrentSemester
                          ? `المساقات المسجلة فعلياً: ${sem.totalHours} ساعة معتمدة (${sem.courses.length} مواد قيد الدراسة)`
                          : `العبء الفصلي: ${sem.totalHours} ساعة معتمدة (${sem.courses.length} مواد) • الحد الأقصى المسموح ${maxAllowed} س.م`}
                      </span>
                    </div>
                  </div>

                  {/* Header Actions (Add course, toggle summer, workload pill) */}
                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    {!sem.isCurrentSemester && (
                      <>
                        <button
                          onClick={() => setAddCourseModalSemIdx(semIdx)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-on-primary hover:bg-primary-container transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                          title="إضافة مقرر لهذا الفصل"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                          <span>إضافة مقرر</span>
                        </button>

                        <button
                          onClick={() => handleToggleSemesterSummer(semIdx)}
                          className="p-1.5 rounded-lg text-xs font-medium bg-surface-container hover:bg-surface-container-high text-on-surface-variant cursor-pointer transition-colors"
                          title="تبديل نوع الفصل (عادي / صيفي)"
                        >
                          <span className="material-symbols-outlined text-base">
                            {sem.isSummer ? 'wb_sunny' : 'domain'}
                          </span>
                        </button>

                        {sem.courses.length === 0 && (
                          <button
                            onClick={() => handleRemoveSemester(semIdx)}
                            className="p-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="حذف هذا الفصل الفارغ"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        )}
                      </>
                    )}

                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                        workload?.isOverloaded
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : sem.workloadColor === 'amber'
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : sem.workloadColor === 'purple'
                          ? 'bg-purple-50 text-purple-900 border-purple-200'
                          : sem.workloadColor === 'emerald'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-blue-50 text-blue-900 border-blue-200'
                      }`}
                    >
                      {workload?.isOverloaded
                        ? `تجاوز السقف (+${sem.totalHours - maxAllowed} س.م) ❌`
                        : sem.workloadStatus}
                    </span>

                    <span className="px-3 py-1 bg-surface-container rounded-lg font-mono text-xs font-bold text-primary">
                      {sem.totalHours} / {maxAllowed} س.م
                    </span>
                  </div>
                </div>

                {/* Courses Table / Cards in this semester */}
                <div className="p-4 sm:p-5">
                  {sem.courses.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-surface-container-high rounded-xl">
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-1">
                        post_add
                      </span>
                      <p className="text-xs text-on-surface-variant font-medium">
                        لا توجد مقررات مجدولة في هذا الفصل حتى الآن.
                      </p>
                      {!sem.isCurrentSemester && (
                        <button
                          onClick={() => setAddCourseModalSemIdx(semIdx)}
                          className="mt-2.5 px-3 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-lg inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                          <span>+ إضافة مساق لهذا الفصل</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {sem.courses.map((course) => {
                        const isMatchFilter =
                          selectedCategoryFilter === 'all'
                            ? true
                            : selectedCategoryFilter === 'college_comp'
                            ? course.category.includes('كلي') &&
                              (course.category.includes('إجبار') || course.category.includes('اجبار'))
                            : selectedCategoryFilter === 'major_comp'
                            ? course.category.includes('تخص') &&
                              (course.category.includes('إجبار') || course.category.includes('اجبار'))
                            : selectedCategoryFilter === 'major_elec'
                            ? course.isElectiveChoice ||
                              course.category.includes('اختيار') ||
                              course.category.includes('إختيار')
                            : selectedCategoryFilter === 'uni_comp'
                            ? course.category.includes('جامع') &&
                              (course.category.includes('إجبار') || course.category.includes('اجبار'))
                            : true;

                        const prereqStatus =
                          validationResult?.coursePrereqMap[`${course.courseNumber}_${sem.id}`];

                        return (
                          <div
                            key={course.courseNumber}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                              !isMatchFilter
                                ? 'opacity-30 grayscale border-surface-container-high'
                                : prereqStatus && !prereqStatus.isMet && !sem.isCurrentSemester
                                ? 'bg-rose-50/40 border-rose-300 ring-2 ring-rose-400/20'
                                : course.isCriticalPath
                                ? 'bg-primary/[0.02] border-primary/20 hover:border-primary shadow-2xs'
                                : 'bg-surface-container-lowest border-surface-container-high/60 hover:border-surface-container-highest'
                            }`}
                          >
                            <div>
                              {/* Course header */}
                              <div className="flex items-start justify-between gap-2">
                                <span
                                  className="font-mono text-xs bg-surface-container px-2 py-0.5 rounded font-bold text-on-surface-variant"
                                  dir="ltr"
                                >
                                  {course.courseNumber}
                                </span>

                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="font-label-sm text-[11px] px-2 py-0.5 rounded font-bold bg-surface-container-low text-primary">
                                    {course.creditHours} س.م
                                  </span>
                                  <span
                                    className={`font-label-sm text-[10px] px-2 py-0.5 rounded font-bold ${
                                      course.difficulty === 'متقدم'
                                        ? 'bg-purple-100 text-purple-900'
                                        : course.difficulty === 'سهل'
                                        ? 'bg-emerald-100 text-emerald-900'
                                        : 'bg-blue-100 text-blue-900'
                                    }`}
                                  >
                                    {course.difficulty}
                                  </span>
                                </div>
                              </div>

                              {/* Course name */}
                              <h5 className="font-label-lg text-sm font-bold text-primary mt-2 leading-tight">
                                {course.courseName}
                              </h5>

                              {/* Category badge & Special Tag */}
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] text-on-surface-variant line-clamp-1">
                                  {course.category}
                                </span>
                                {sem.isCurrentSemester && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                    قيد الدراسة بالفصل الحالي
                                  </span>
                                )}
                                {course.isElectiveChoice && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    خيار اختياري (تخصص)
                                  </span>
                                )}
                              </div>

                              {/* Real-time Prerequisite Status Pill with Official Grade / Audit Criteria */}
                              {!sem.isCurrentSemester && prereqStatus && (
                                <div className="mt-2">
                                  {prereqStatus.hasPrereq ? (
                                    prereqStatus.statusType === 'officially_completed' ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-fit shadow-2xs">
                                        <span className="material-symbols-outlined text-[13px]">
                                          verified
                                        </span>
                                        <span>المتطلب مستوفى رسمياً ✓ (منجز بالخطة)</span>
                                      </span>
                                    ) : prereqStatus.statusType === 'enrolled_pending_grade' ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-fit shadow-2xs">
                                        <span className="material-symbols-outlined text-[13px]">
                                          pending
                                        </span>
                                        <span>قيد الدراسة حالياً ⏳ (يُعتمد بعد صدور العلامة كـ منجز)</span>
                                      </span>
                                    ) : prereqStatus.statusType === 'scheduled_earlier' ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1 w-fit">
                                        <span className="material-symbols-outlined text-[13px]">
                                          calendar_month
                                        </span>
                                        <span>مجدول في فصل سابق 🗓️</span>
                                      </span>
                                    ) : prereqStatus.statusType === 'corequisite_same_term' ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1 w-fit">
                                        <span className="material-symbols-outlined text-[13px]">
                                          sync_alt
                                        </span>
                                        <span>متطلب مرافق (مسجل بنفس الفصل)</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1 w-fit">
                                        <span className="material-symbols-outlined text-[13px]">
                                          cancel
                                        </span>
                                        <span>
                                          يتطلب اجتياز: {prereqStatus.prereqName || prereqStatus.prereqCode}
                                        </span>
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[10px] font-medium text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container">
                                      مساق تأسيسي (بدون متطلب)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Reason Badge & Action Buttons */}
                            <div className="pt-2 border-t border-surface-container-high/40 space-y-1.5">
                              {course.prerequisite && course.prerequisite !== '—' && (
                                <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                                  <span className="material-symbols-outlined text-xs text-primary">
                                    link
                                  </span>
                                  <span className="line-clamp-1 font-medium">
                                    المتطلب: {course.prerequisite}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                                <span className="material-symbols-outlined text-xs text-secondary">
                                  tips_and_updates
                                </span>
                                <span className="line-clamp-1">{course.reason}</span>
                              </div>

                              <div className="flex items-center justify-between gap-1 pt-1">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() =>
                                      handleCopyCourseCode(course.courseNumber, course.courseName)
                                    }
                                    title="نسخ رقم المساق للتسجيل"
                                    className="text-[11px] font-bold text-on-surface-variant hover:text-primary flex items-center gap-1 py-1 px-2 rounded hover:bg-surface-container cursor-pointer transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-xs">
                                      content_copy
                                    </span>
                                    <span>نسخ الرمز</span>
                                  </button>
                                </div>

                                {/* Shift course & Remove controls (only allowed for upcoming semesters) */}
                                {!sem.isCurrentSemester && (
                                  <div className="flex items-center gap-1">
                                    {semIdx > (activeSemesters[0]?.isCurrentSemester ? 1 : 0) && (
                                      <button
                                        onClick={() =>
                                          moveCourseToSemester(course.courseNumber, semIdx, semIdx - 1)
                                        }
                                        title="نقل إلى الفصل السابق"
                                        className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined text-base">
                                          arrow_forward
                                        </span>
                                      </button>
                                    )}

                                    {semIdx < activeSemesters.length - 1 && (
                                      <button
                                        onClick={() =>
                                          moveCourseToSemester(course.courseNumber, semIdx, semIdx + 1)
                                        }
                                        title="نقل إلى الفصل التالي"
                                        className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined text-base">
                                          arrow_back
                                        </span>
                                      </button>
                                    )}

                                    <button
                                      onClick={() =>
                                        handleRemoveCourseFromSemester(course.courseNumber, semIdx)
                                      }
                                      title="إزالة المقرر وحفظه في حوض المواد غير المجدولة"
                                      className="p-1 rounded hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-base">
                                        delete_outline
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 8. Course Selection Modal for Interactive Plan Customization */}
      {addCourseModalSemIdx !== null && modalTargetSem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-surface-container-high flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-surface-container-high/60 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-xl">
                    library_add
                  </span>
                  <span>إضافة مقرر إلى {modalTargetSem.semesterName}</span>
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  العبء الحالي:{' '}
                  <strong className="text-primary font-mono">{modalTargetSem.totalHours} س.م</strong> •
                  الحد الأقصى:{' '}
                  <strong className="text-primary font-mono">
                    {modalTargetSem.isGraduationSemester
                      ? modalTargetSem.isSummer
                        ? 12
                        : 21
                      : modalTargetSem.isSummer
                      ? 10
                      : 18}{' '}
                    س.م
                  </strong>
                </p>
              </div>

              <button
                onClick={() => setAddCourseModalSemIdx(null)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Search & Tabs */}
            <div className="p-4 border-b border-surface-container-high/40 bg-surface-container-low/30 space-y-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant text-base">
                  search
                </span>
                <input
                  type="text"
                  value={courseModalSearch}
                  onChange={(e) => setCourseModalSearch(e.target.value)}
                  placeholder="ابحث باسم المساق أو رقمه..."
                  className="w-full pl-3 pr-9 py-2 bg-surface-container-lowest border border-surface-container-high rounded-xl text-xs focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCourseModalTab('compulsory')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    courseModalTab === 'compulsory'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
                  }`}
                >
                  المقررات الإجبارية المتبقية ({validationResult?.unassignedCompulsoryCourses.length || 0})
                </button>
                <button
                  onClick={() => setCourseModalTab('elective')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    courseModalTab === 'elective'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
                  }`}
                >
                  بنك اختياري التخصص ({validationResult?.availableElectivePool.length || 0})
                </button>
              </div>
            </div>

            {/* Modal Course List */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {(() => {
                const sourceList =
                  courseModalTab === 'compulsory'
                    ? validationResult?.unassignedCompulsoryCourses || []
                    : validationResult?.availableElectivePool || [];

                const filtered = sourceList.filter((c) => {
                  const matchSearch =
                    courseModalSearch.trim() === ''
                      ? true
                      : c.courseName.includes(courseModalSearch) ||
                        c.courseNumber.includes(courseModalSearch);

                  const notInSem = !modalTargetSem.courses.some(
                    (sc) =>
                      normalizeCourseCode(sc.courseNumber) === normalizeCourseCode(c.courseNumber)
                  );

                  return matchSearch && notInSem;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-on-surface-variant">
                      لا توجد مقررات مطابقة للبحث أو أن جميع المقررات في هذا القسم مجدولة بالفعل.
                    </div>
                  );
                }

                return filtered.map((course) => {
                  const normCode = normalizeCourseCode(course.courseNumber);
                  const prereqCode = getOfficialPrerequisiteCode(normCode);
                  const isCoreq = isCourseCorequisite(normCode);

                  let isPrereqMet = true;
                  let missingPrereqTitle = '';

                  if (prereqCode) {
                    const normPrereq = normalizeCourseCode(prereqCode);
                    const isOfficiallyCompleted = officiallyCompletedCodesForModal.has(normPrereq);
                    const isCurrentlyEnrolled = currentlyEnrolledCodesForModal.has(normPrereq);
                    const isScheduledEarlier = earlierScheduledCodesForModal.has(normPrereq);
                    const isMetInSameTerm =
                      isCoreq &&
                      modalTargetSem.courses.some(
                        (c) => normalizeCourseCode(c.courseNumber) === normPrereq
                      );
                    isPrereqMet =
                      isOfficiallyCompleted ||
                      isCurrentlyEnrolled ||
                      isScheduledEarlier ||
                      isMetInSameTerm;

                    if (!isPrereqMet) {
                      const prereqEntry = getOfficialCourse(normPrereq);
                      missingPrereqTitle = prereqEntry?.courseName || prereqCode;
                    }
                  }

                  const normCourseCode = normalizeCourseCode(course.courseNumber);
                  const pCode = getOfficialPrerequisiteCode(normCourseCode);
                  const normPCode = pCode ? normalizeCourseCode(pCode) : '';
                  const isPrereqOfficiallyDone = normPCode
                    ? officiallyCompletedCodesForModal.has(normPCode)
                    : true;
                  const isPrereqEnrolledNow = normPCode
                    ? currentlyEnrolledCodesForModal.has(normPCode)
                    : false;

                  return (
                    <div
                      key={course.courseNumber}
                      className="p-3 rounded-xl border border-surface-container-high bg-surface-container-lowest hover:border-primary/40 flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
                            {course.courseNumber}
                          </span>
                          <span className="text-xs font-bold text-primary font-mono">
                            {course.creditHours} س.م
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            {course.category}
                          </span>
                        </div>

                        <h5 className="font-bold text-xs text-primary leading-tight">
                          {course.courseName}
                        </h5>

                        <div className="flex items-center gap-2 text-[11px] flex-wrap">
                          {!pCode ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">
                                check_circle
                              </span>
                              <span>مساق تأسيسي (بدون متطلب سابق)</span>
                            </span>
                          ) : isPrereqOfficiallyDone ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">
                                verified
                              </span>
                              <span>المتطلب مستوفى رسمياً ✓ (صدرت علامته واعتُمد كمنجز)</span>
                            </span>
                          ) : isPrereqEnrolledNow ? (
                            <span className="text-amber-800 font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">
                                pending
                              </span>
                              <span>قيد الدراسة حالياً ⏳ (يُعتمد بعد صدور علامته كـ منجز)</span>
                            </span>
                          ) : isPrereqMet ? (
                            <span className="text-blue-700 font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">
                                calendar_month
                              </span>
                              <span>المتطلب مجدول في فصل سابق بالخطة</span>
                            </span>
                          ) : (
                            <span className="text-rose-700 font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">warning</span>
                              <span>يتطلب اجتياز: {missingPrereqTitle} أولاً</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddCourseToSemester(course, addCourseModalSemIdx)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-on-primary hover:bg-primary-container transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span>إضافة للفصل</span>
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 9. Smart Academic Advisory Note Box */}
      <div className="mt-space-lg bg-primary-container text-on-primary rounded-2xl p-6 shadow-sm border border-secondary/20 relative overflow-hidden">
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-on-secondary shrink-0 shadow-md">
            <span className="material-symbols-outlined text-2xl">psychology</span>
          </div>

          <div className="space-y-2">
            <h4 className="font-headline-sm text-base sm:text-headline-sm font-bold text-on-primary">
              تعليمات المرشد الأكاديمي وضوابط جامعة مؤتة الرسمية:
            </h4>
            <ul className="text-xs sm:text-sm text-on-primary-container space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                <strong>ضابط اعتماد المتطلبات الأكاديمية (الخطة التدقيقية الرسمية):</strong> يُعتمد المتطلب السابق كمستوفى رسمياً حصراً <strong>بعد صدور علامته النهائية واعتماده بحالة 'منجز' في الخطة التدقيقية من قبل الموقع الأصلي للجامعة</strong>. المقررات المسجلة حالياً بالفصل الحالي تظل مصنفة كـ <em>(قيد الدراسة - بانتظار صدور العلامة)</em> وتتحول إلى منجزة رسمياً فور رصد علاماتها النهائية بالموقع الأصلي.
              </li>
              <li>
                <strong>تخصيص الخطة ومؤشر السلامة:</strong> يمكنك إضافة، إزالة، ونقل أي مادة بين الفصول بحرية تامة، وسيقوم النظام فوراً بحساب نسبة الدقة وسلامة الاختيار واقتراح الحلول الفورية بنقرة واحدة.
              </li>
              <li>
                <strong>قاعدة الحد الأقصى للعبء الفصلي (18 / 21 س.م وعادي / صيفي):</strong> في الفصول العادية يُسمح بتسجيل حتى <strong>18 ساعة معتمدة</strong> كحد أقصى، ويُسمح للطالب الخريج حصراً بتسجيل حتى <strong>21 ساعة معتمدة</strong> في فصل التخرج. وفي الفصل الصيفي يكون الحد الأقصى <strong>10 ساعات معتمدة</strong>، ويُسمح للخريج بالصيفي بتسجيل حتى <strong>12 ساعة معتمدة</strong>.
              </li>
              <li>
                <strong>حساب ساعات التخصص الاختيارية:</strong> الخطة تقتضي إنهاء <strong>9 ساعات</strong> اختياري تخصص. بعد إنجاز 3 ساعات سابقاً وتسجيل 2 ساعة في الفصل الحالي، تبقى <strong>4 ساعات معتمدة فقط</strong> للتسكين حتى التخرج بدقة 100%.
              </li>
              <li>
                <strong>أولوية مشروع التخرج:</strong> يجب إنهاء مشروع تخرج 1 قبل مشروع تخرج 2، ويُفضل دوماً أن يكون مشروع تخرج 2 في الفصل الأخير.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Official Print Footer */}
      <PrintFooter />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 bg-primary text-on-primary px-4 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-5 border border-secondary/30">
          <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
