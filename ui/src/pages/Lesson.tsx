import { createRef, FC, ForwardRefRenderFunction, MutableRefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCtx, LessonPlanWithQuestions, LessonResponse, LessonWithResponses, TeacherData } from "../data-model";
import { useNavigate, useParams } from "react-router-dom";
import { parseISO } from "date-fns"
import { groupBy, isEqual, set, uniq } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { faChevronLeft, faLink } from "@fortawesome/free-solid-svg-icons";
import LessonQuestionResponses from "./LessonQuestionResponses";
import Chart, { ChartData } from 'chart.js/auto'
import { getRelativePosition } from 'chart.js/helpers'

export interface LessonProps {}

const Lesson: FC<LessonProps> = ({}) => {
    // Global state
    const { user, callCloudFunction } = useContext(AppCtx)!
    const navigate = useNavigate()
    
    // Fetch teacher data
    const [teacherData, setTeacherData] = useState<TeacherData|null>()
    const [crudError, setCrudError] = useState<string>()
    const fetchTeacherData = useCallback(async () => {
        if (user) {
            setTeacherData(undefined)
            try {
                const newTeacherData = await callCloudFunction<TeacherData>("getTeacherData", {})
                if (newTeacherData) {
                    setTeacherData(newTeacherData)
                } else {
                    setTeacherData(null)
                }
            } catch (e) {
                setCrudError((e as Error).toString())
                setTeacherData(null)
            }
        }
    }, [user])
    useEffect(() => {
        fetchTeacherData()
    }, [fetchTeacherData])

    // Fetch lesson and lesson plan
    const { id: lessonId } = useParams()
    const [lesson, setLesson] = useState<LessonWithResponses>()
    const [lessonPlan, setLessonPlan] = useState<LessonPlanWithQuestions>()
    const thisClass = useMemo(() => {
        if (teacherData?.classes && lesson) {
            return teacherData.classes.find(c => c.id === lesson.class_id)
        }
    }, [teacherData?.classes, lesson])
    useEffect(() => {
        if (teacherData && lessonId && !lesson) {
            callCloudFunction<LessonWithResponses[]>("getLessons", {}).then((_lessons) => {
                setLesson(_lessons?.find(l => l.id === lessonId))
            })
        }
    }, [lessonId, teacherData, lesson])
    useEffect(() => {
        if (lesson?.id) {
            callCloudFunction<LessonPlanWithQuestions[]>("getLessonPlans", {}).then((_lessonPlans) => {
                setLessonPlan(_lessonPlans?.find(lp => lp.id === lesson.lesson_plan_id))
            })
        }
    }, [lesson?.id])
    const editLesson = useCallback(
        async (id: string, lessonInput: LessonWithResponses, skipLocalStateUpdate = false) => {
            if (teacherData) {
                try {
                    const oldLesson = teacherData?.lessons?.find((l) => l.id === id)
                    if (oldLesson && !isEqual(oldLesson, lessonInput)) {
                        if (!skipLocalStateUpdate) {
                            // Update our local state
                            let newLessons = [...(teacherData.lessons ?? [])]
                            const newLesson = {
                                ...oldLesson,
                                ...lessonInput,
                            }
                            newLessons[newLessons.findIndex((l) => l.id === id)] = newLesson
                            if (lessonInput.deleted) {
                                newLessons = newLessons.filter((l) => l.id !== id)
                            }
                            setLesson(newLesson)
                            setTeacherData(
                                (td) =>
                                    ({
                                        ...td,
                                        lessons: newLessons,
                                    }) as TeacherData,
                            )
                        }
                        // Then update the database
                        await callCloudFunction("putLesson", {
                            ...lessonInput,
                            updated_at: new Date().toISOString(),
                        })
                        // refreshTeacherData()
                        // window.location.reload()
                    }
                } catch (e) {
                    console.error(e)
                }
            }
        },
        [teacherData, callCloudFunction],
    )
    const responsesByQID = useMemo(() => {
        if (lesson?.responses) {
            return groupBy(lesson.responses, (r) => r.question_id)
        }
        return {}
    }, [lesson, lesson?.responses])
    const studentNamesFinishedByQID = useMemo(() => {
        if (lesson?.responses) {
            return lesson.responses.reduce((acc, r) => {
                acc[r.question_id] = [...(acc[r.question_id] ?? []), r.student_name]
                return acc
            }, {} as Record<string, string[]>)
        }
        return {}
    }, [lesson?.responses])
    const studentNamesNotFinishedByQID = useMemo(() => {
        if (teacherData?.classes) {
            return lesson?.lesson_plan?.questions.reduce((acc, q) => {
                acc[q.id] = thisClass?.students?.filter(s => !studentNamesFinishedByQID?.[q.id]?.includes(s.nickname))
                    ?.map(s => s.nickname) ?? []
                return acc
            }, {} as Record<string, string[]>) ?? {}
        }
        return {}
    }, [teacherData, lesson, thisClass])
    const studentNamesStartedNotFinishedByQID = useMemo(() => {
        return Object.entries(studentNamesFinishedByQID).reduce((acc, [qid, studentNamesFinished]) => {
            acc[qid] = lesson?.student_names_started?.filter((sn) => !studentNamesFinished?.includes(sn)) ?? []
            return acc
        }, {} as Record<string, string[]>)
    }, [lesson?.student_names_started, studentNamesFinishedByQID])
    // const studentNamesFinished = useMemo(() => {
    //     if (lesson?.responses) {
    //         const grouped = Object.values(groupBy(lesson.responses.map(r => r.student_name), (n) => n))
    //         return uniq(grouped.filter(g => g.length === lessonPlan?.questions.length).flatMap(g => g))
    //     }
    // }, [lessonPlan?.questions, lesson?.responses])
    // const studentNamesNotFinished = useMemo(() => {
    //     if (teacherData?.classes) {
    //         const thisClass = teacherData.classes.find(c => c.id === lesson?.class_id)
    //         return thisClass?.students?.filter(s => !studentNamesFinished?.includes(s.nickname))
    //             .map(s => s.nickname)
    //     }
    //     return []
    // }, [teacherData?.classes, studentNamesFinished])
    // const studentNamesStartedNotFinished = useMemo(() => {
    //     return lesson?.student_names_started?.filter((sn) => !studentNamesFinished?.includes(sn))
    // }, [lesson?.student_names_started, studentNamesFinished])
    const chartCanvasRef = useRef<HTMLCanvasElement>(null)
    const [chart, setChart] = useState<Chart>()
    useEffect(() => {
        if (chartCanvasRef.current && lesson && lessonPlan && !chart) {
            const allCategories = uniq(Object.values(lesson?.analysis_by_question_id ?? {}).flatMap((analysis) => Object.keys(analysis?.responses_by_category ?? {})))
            const datasets = Object.keys(lesson?.analysis_by_question_id ?? {})?.map((qid, i) => ({
                label: `Question ${(lessonPlan?.questions.findIndex(q => q.id === qid) ?? 0) + 1}`,
                data: allCategories?.map((category) => lesson?.analysis_by_question_id?.[qid]?.responses_by_category?.[category]?.length ?? 0),
                // borderColor: `rgb(${Math.min(255, i * 20)}, 112, ${Math.min(255, (i+1) * 90)})`,
                backgroundColor: `rgba(${Math.min(255, i * 20)}, 112, ${Math.min(255, (i+1) * 90)}, 0.9)`,
            }))
            const data: ChartData = {
                labels: allCategories,
                datasets,
            }
            setChart(new Chart(chartCanvasRef.current, {
                type: 'bar',
                data,
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                        }
                    }
                },
            }))
        }
    }, [chartCanvasRef, lesson, lessonPlan, lesson?.analysis_by_question_id, chart])

    // Poll for lesson responses
    // useEffect(() => {
    //     if (lesson && (
    //         !lesson.analysis_by_question_id ||
    //         Object.keys(lesson.analysis_by_question_id).some(qid =>
    //             !Object.keys(lesson.analysis_by_question_id?.[qid].responses_by_category ?? {}).length
    //         ))
    //     ) {
    //         const interval = setInterval(() => {
    //             callCloudFunction<LessonWithResponses[]>("getLessons", {}).then((_lessons) => {
    //                 const newLesson = _lessons?.find(l => l.id === lesson.id)
    //                 setLesson(l => {
    //                     if (l && newLesson?.responses) {
    //                         l.responses = [...newLesson.responses]
    //                     }
    //                     if (l && newLesson?.analysis_by_question_id) {
    //                         l.analysis_by_question_id = newLesson.analysis_by_question_id
    //                     }
    //                     return l
    //                 })
    //                 if (newLesson?.analysis_by_question_id) {
    //                     clearInterval(interval)
    //                 }
    //             })
    //         }, 2000)
    //         return () => clearInterval(interval)
    //     }
    // }, [lesson, lesson?.analysis_by_question_id, callCloudFunction])
    const [deleting, setDeleting] = useState(false)
    const [copiedLink, setCopiedLink] = useState(false)

    return <div className="light">
        <div className="seek-page">
            <div className="page-content">{!lesson
                ? <div>
                    <p>Loading (please be patient)...</p>
                </div>
                : <div>
                    <section className="faint-bg">
                        <div className="content-gutters">
                            <div style={{ margin: "20px 0" }}>
                                <button onClick={() => history.back()}>
                                    <FontAwesomeIcon icon={faChevronLeft} />&nbsp;
                                    Back
                                </button>
                            </div>
                            <h2 style={{ display: "flex", justifyContent: "space-between" }}>
                                <input
                                    className="inline-input"
                                    style={{ flexGrow: 1 }}
                                    value={lesson.lesson_name}
                                    onChange={(e) => {
                                        setLesson(l => ({
                                            ...l,
                                            lesson_name: e.target.value,
                                        }) as LessonWithResponses)
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.currentTarget.blur()
                                        }
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => {
                                            editLesson(lesson.id, lesson)
                                        })
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        if (window.confirm(`Are you sure you want to delete ${lesson.lesson_name}?`)) {
                                            setDeleting(true)
                                            editLesson(lesson.id, {
                                                ...lesson,
                                                deleted: true,
                                            }).then(() => {
                                                window.location.href = "/"
                                            })
                                        }
                                    }}
                                >
                                    {deleting ? <em>Deleting...&nbsp;</em> : ""}
                                    <FontAwesomeIcon icon={faTrashCan} />
                                </button>
                            </h2>
                            <p style={{ marginTop: "-8px" }}>Class: {lesson.class_name}</p>
                            <p>
                                <button
                                    onClick={() => {
                                        setCopiedLink(true)
                                        navigator.clipboard.writeText(
                                            `${import.meta.env.VITE_WEB_APP_URL}/${teacherData?.email_address}/${lessonId}`
                                        )
                                    }}
                                    style={{
                                        opacity: copiedLink ? "0.5" : "1",
                                    }}>
                                    <FontAwesomeIcon icon={faLink} />&nbsp;
                                    {copiedLink ? "Student link copied" : "Copy student link to lesson"}
                                </button>
                            </p>

                            <hr />

                            {!!lesson.analysis_by_question_id && !!lessonPlan?.questions && <>
                                <div className="charts" style={{ width: "100%", height: "300px" }}>
                                    <canvas id="chart-canvas" ref={chartCanvasRef}></canvas>
                                </div>
                                <div style={{ margin: "30px 0 40px" }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th colSpan={4} style={{ color: "#444" }}>Student</th>
                                                {lessonPlan?.questions.map((q, i) =>
                                                    <th colSpan={4} style={{ color: "#444" }} key={q.id}>Question {i + 1}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {thisClass?.students?.map((student) => <tr key={student.nickname}>
                                                <td colSpan={4} style={{ border: "1px solid #aaa", padding: "10px" }}>
                                                    {student.nickname}
                                                </td>
                                                {lessonPlan?.questions.map(q =>
                                                    <td key={q.id} colSpan={4}
                                                        style={{ border: "1px solid #aaa", padding: "10px" }}>
                                                        {Object.entries(lesson.analysis_by_question_id![q.id]?.responses_by_category ?? {})
                                                            .filter(([ _, resps ]) => resps.find(r => r.student_name === student.nickname))
                                                            .map(([cat]) => cat)
                                                            .join(", ")}
                                                    </td>
                                                )}
                                            </tr>)}
                                        </tbody>
                                    </table>
                                </div>
                                <hr />
                            </>}

                            {lessonPlan?.questions?.map((q, i) => <div key={q.id} style={{ marginBottom: "60px" }}>
                                <h3 style={{ marginTop: "35px" }}>
                                    <small className="supertitle">Question {i+1}:</small>
                                    {q.body_text}
                                </h3>
                                
                                <div>
                                    {!responsesByQID[q.id]?.length && <p>
                                        <em>Waiting for the class to begin</em>
                                    </p>}
                                    {!!studentNamesFinishedByQID[q.id]?.length && <p>
                                        Got responses from {studentNamesFinishedByQID[q.id]?.join(", ")}
                                    </p>}
                                    {!!studentNamesNotFinishedByQID[q.id]?.length && !studentNamesStartedNotFinishedByQID[q.id]?.length && <p>
                                        <em>Did not get responses from</em>&nbsp;
                                        {studentNamesNotFinishedByQID[q.id]?.join(", ")}
                                    </p>}
                                    {!!studentNamesStartedNotFinishedByQID[q.id]?.length && <p>
                                        <em>Still waiting for:</em>&nbsp;
                                        {studentNamesStartedNotFinishedByQID[q.id]?.join(", ")}
                                    </p>}
                                </div>

                                {!!q.media_content_urls?.length &&
                                <div style={{ display: "flex", gap: "10px", height: "150px" }}>
                                    {q.media_content_urls?.map((url) => <img key={url} src={url} alt="media" />)}
                                </div>}

                                <hr />

                                <div id="student-responses">
                                    <div style={{ marginBottom: "20px" }}>
                                        {lesson.questions_locked?.includes(q.id)
                                            ? <>
                                                <span style={{ opacity: "0.5", marginRight: "20px" }}>
                                                    <em>Responses locked</em>
                                                </span>
                                                {/* <button
                                                    disabled={
                                                        !lesson.responses?.filter(r => r.question_id === q.id) ||
                                                        lesson.responses.filter(r => r.question_id === q.id).some(r => !r.analysis)
                                                    }
                                                    onClick={() => {
                                                        const newQuestionsLocked = lesson.questions_locked?.filter(qid => qid !== q.id)
                                                        editLesson(lesson.id, {
                                                            ...lesson,
                                                            questions_locked: newQuestionsLocked,
                                                        })
                                                    }}>
                                                    Unlock
                                                </button> */}
                                            </>
                                            : <button
                                                disabled={
                                                    !lesson.responses?.filter(r => r.question_id === q.id) ||
                                                    lesson.responses.filter(r => r.question_id === q.id).some(r => !r.analysis)
                                                }
                                                onClick={() => {
                                                    editLesson(lesson.id, {
                                                        ...lesson,
                                                        questions_locked: [ ...(lesson.questions_locked ?? []), q.id ],
                                                    })
                                                }}>
                                                Lock responses
                                            </button>}
                                    </div>

                                    {!lesson.responses?.length && <>
                                        <p style={{ marginBottom: "30px" }}><em>No responses yet</em></p>
                                    </>}

                                    {lesson.questions_locked?.includes(q.id) &&
                                    !!lesson.responses?.length &&
                                    !lesson.analysis_by_question_id?.[q.id]?.responses_by_category && <>
                                        <p style={{ marginBottom: "30px" }}><em>Analyzing (may take up to a minute &mdash; do not leave the page)...</em></p>
                                    </>}

                                    <div style={{ marginTop: "-15px" }}>
                                        {lesson.analysis_by_question_id?.[q.id]?.responses_by_category &&
                                        <LessonQuestionResponses
                                            analysis={lesson.analysis_by_question_id![q.id]}
                                            onAnalysisChange={(newAnalysis) => {
                                                editLesson(lesson.id, {
                                                    ...lesson,
                                                    analysis_by_question_id: {
                                                        ...lesson.analysis_by_question_id,
                                                        [q.id]: newAnalysis,
                                                    },
                                                }, true)
                                            }}
                                        />}
                                    </div>
                                </div>
                            </div>)}
                        </div>
                    </section>
                </div>
            }</div>
        </div>
    </div>
}

export default Lesson
