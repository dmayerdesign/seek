import { FC, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppCtx, LessonPlanWithQuestions, LessonWithResponses, TeacherData } from "../data-model";
import { useNavigate, useParams } from "react-router-dom";
import { isEqual } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";

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
    }, [lessonId, teacherData])
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
                    const oldLesson = teacherData?.lessons.find((lp) => lp.id === id)
                    if (oldLesson && !isEqual(oldLesson, lessonInput)) {
                        // Update our local state
                        let newLessons = [...teacherData.lessons]
                        newLessons[newLessons.findIndex((lp) => lp.id === id)] = lessonInput
                        if (lessonInput.deleted) {
                            newLessons = newLessons.filter((lp) => lp.id !== id)
                        }
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
        [teacherData],
    )
    const studentsStartedNotFinished = useMemo(() => {
        return lesson?.student_names_started?.filter((sn) => !lesson.responses?.find((r) => r.student_name === sn && !r.analysis))
    }, [lesson])

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
                                            editLesson(lesson.id, {
                                                ...lesson,
                                                deleted: true,
                                            }).finally(() => {
                                                navigate("/")
                                            })
                                        }
                                    }}
                                >
                                    <FontAwesomeIcon icon={faTrashCan} />
                                </button>
                            </h2>
                            <p style={{ marginTop: "-8px" }}>Class: {lesson.class_name}</p>

                            <hr />

                            {studentsStartedNotFinished?.length
                                ? <p>
                                    <em>Still waiting for:</em>
                                    {studentsStartedNotFinished?.join(", ")}
                                </p>
                                : <p>
                                    <em>Waiting for the class to begin</em>
                                </p>
                            }

                            <hr />

                            {lessonPlan?.questions.map((q) => <div key={q.id}>
                                <h3>
                                    <small>Question 1:</small>
                                    {q.body_text}
                                </h3>
                                {!!q.media_content_urls?.length &&
                                <div style={{ display: "flex", gap: "10px", height: "150px" }}>
                                    {q.media_content_urls?.map((url) => <img key={url} src={url} alt="media" />)}
                                </div>}

                                <hr />

                                <div id="student-responses">
                                    {lesson.responses?.length
                                        ? lesson.responses
                                            .filter((r) => r.question_id === q.id)
                                            .filter((r) => r.analysis)
                                            .map((r) =>
                                                <div className="student-response" key={r.student_name}>
                                                    <p>{r.student_name} submitted:</p>
                                                    <p>{r.analysis!.response_summary}</p>
                                                    {r.response_image_base64 &&
                                                        <img src={r.response_image_base64} alt={r.analysis!.response_summary}
                                                            style={{ height: "100px" }}
                                                        />}
                                                </div>)
                                        : <p><em>No responses yet</em></p>
                                    }
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
