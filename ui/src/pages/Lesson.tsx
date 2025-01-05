import { createRef, FC, ForwardRefRenderFunction, MutableRefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCtx, LessonPlanWithQuestions, LessonWithResponses, TeacherData } from "../data-model";
import { useNavigate, useParams } from "react-router-dom";
import { parseISO } from "date-fns"
import { groupBy, isEqual, set, uniq } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { faChevronLeft, faLink } from "@fortawesome/free-solid-svg-icons";
import LessonQuestionResponses from "./LessonQuestionResponses";

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
    useEffect(() => {
        if (teacherData && lessonId && !lesson) {
            callCloudFunction<LessonWithResponses[]>("getLessons", {}).then((_lessons) => {
                setLesson(_lessons?.find(l => l.id === lessonId))
            })
        }
    }, [lessonId, teacherData, lesson])
    useEffect(() => {
        if (lesson) {
            callCloudFunction<LessonPlanWithQuestions[]>("getLessonPlans", {}).then((_lessonPlans) => {
                setLessonPlan(_lessonPlans?.find(lp => lp.id === lesson.lesson_plan_id))
            })
        }
    }, [lesson])
    const editLesson = useCallback(
        async (id: string, lessonInput: LessonWithResponses) => {
            if (teacherData) {
                try {
                    const oldLesson = teacherData?.lessons?.find((l) => l.id === id)
                    if (oldLesson && !isEqual(oldLesson, lessonInput)) {
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
                        // Then update the database
                        await callCloudFunction("putLesson", {
                            ...lessonInput,
                            updated_at: new Date().toISOString(),
                        })
                        // refreshTeacherData()
                    }
                } catch (e) {
                    console.error(e)
                }
            }
        },
        [teacherData, callCloudFunction],
    )
    const studentNamesFinished = useMemo(() => {
        if (lesson?.responses) {
            const grouped = Object.values(groupBy(lesson.responses.map(r => r.student_name), (n) => n))
            return uniq(grouped.filter(g => g.length === lessonPlan?.questions.length).flatMap(g => g))
        }
    }, [lessonPlan?.questions, lesson?.responses])
    const studentNamesNotFinished = useMemo(() => {
        if (teacherData?.classes) {
            const thisClass = teacherData.classes.find(c => c.id === lesson?.class_id)
            return thisClass?.students?.filter(s => !studentNamesFinished?.includes(s.nickname))
                .map(s => s.nickname)
        }
        return []
    }, [teacherData?.classes, studentNamesFinished])
    const studentNamesStartedNotFinished = useMemo(() => {
        return lesson?.student_names_started?.filter((sn) => !studentNamesFinished?.includes(sn))
    }, [lesson?.student_names_started, studentNamesFinished])
    // Poll for lesson responses
    useEffect(() => {
        if (lesson && !lesson.analysis_by_question_id) {
            const interval = setInterval(() => {
                callCloudFunction<LessonWithResponses[]>("getLessons", {}).then((_lessons) => {
                    const newLesson = _lessons?.find(l => l.id === lesson.id)
                    setLesson(l => {
                        if (l && newLesson?.responses) {
                            l.responses = [...newLesson.responses]
                        }
                        if (l && newLesson?.analysis_by_question_id) {
                            l.analysis_by_question_id = newLesson.analysis_by_question_id
                        }
                        return l
                    })
                    if (newLesson?.analysis_by_question_id) {
                        clearInterval(interval)
                    }
                })
            }, 2000)
            return () => clearInterval(interval)
        }
    }, [lesson, callCloudFunction])
    const [deleting, setDeleting] = useState(false)
    const [copiedLink, setCopiedLink] = useState(false)

    return <div className="light">
        <div className="seek-page">
            <div className="page-content">{!lesson
                ? <div>
                    <p>Loading...</p>
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
                                                navigate("/")
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
                                    {copiedLink ? "Link copied" : "Copy link to lesson"}
                                </button>
                            </p>

                            <hr />

                            {!lesson.responses?.length && <p>
                                <em>Waiting for the class to begin</em>
                            </p>}
                            {!!studentNamesFinished?.length && <p>
                                Got responses from {studentNamesFinished?.join(", ")}
                            </p>}
                            {!!studentNamesNotFinished?.length && !studentNamesStartedNotFinished?.length && <p>
                                <em>Did not get responses from</em>&nbsp;
                                {studentNamesNotFinished?.join(", ")}
                            </p>}
                            {!!studentNamesStartedNotFinished?.length && <p>
                                <em>Still waiting for:</em>&nbsp;
                                {studentNamesStartedNotFinished?.join(", ")}
                            </p>}

                            <div>
                                {lesson.responses_locked
                                    ? <span style={{ opacity: "0.5" }}>
                                        <em>Responses locked</em>
                                    </span>
                                    : <button onClick={() => {
                                        editLesson(lesson.id, {
                                            ...lesson,
                                            responses_locked: true,
                                        })
                                    }}>
                                        Lock responses
                                    </button>}
                            </div>

                            <hr />

                            {lessonPlan?.questions.map((q, i) => <div key={q.id}>
                                <h3 style={{ marginTop: "35px" }}>
                                    <small className="supertitle">Question {i+1}:</small>
                                    {q.body_text}
                                </h3>

                                {!!q.media_content_urls?.length &&
                                <div style={{ display: "flex", gap: "10px", height: "150px" }}>
                                    {q.media_content_urls?.map((url) => <img key={url} src={url} alt="media" />)}
                                </div>}

                                <hr />

                                <div id="student-responses">
                                    {!lesson.responses?.length && <>
                                        <p style={{ marginBottom: "30px" }}><em>No responses yet</em></p>
                                    </>}

                                    {lesson.responses_locked &&
                                    !!lesson.responses?.length &&
                                    !lesson.analysis_by_question_id?.[q.id]?.responses_by_category && <>
                                        <p style={{ marginBottom: "30px" }}><em>Analyzing...</em></p>
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
                                                })
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
