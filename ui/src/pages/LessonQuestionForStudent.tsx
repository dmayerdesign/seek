import { FC, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCtx, LessonQuestion, LessonResponse, LessonWithResponses, Student } from "../data-model";
import CanvasInput from "../components/CanvasInput";
import { v4 } from "uuid";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHandPointer, faKeyboard } from "@fortawesome/free-regular-svg-icons";
import { urlToFile } from "../utils";
import { useLocation } from "react-router-dom";


export interface LessonQuestionForStudentProps {
    lesson: LessonWithResponses
    student: Student
    question: LessonQuestion
    submitResponse: (response: LessonResponse) => Promise<void>
}

const LessonQuestionForStudent: FC<LessonQuestionForStudentProps> = ({ lesson, student, question, submitResponse }) => {
    const { uploadFile } = useContext(AppCtx)!
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const responseAlreadySubmitted = useMemo(
        () => lesson.responses?.find(r => r.question_id === question.id && r.student_id === student.id),
        [lesson.responses, student],
    )
    // const [whichInputShown, setWhichInputShown] = useState<"type"|"draw">("type")
    const [responseHasDrawing, setResponseHasDrawing] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
	const [typedInput, setTypedInput] = useState(responseAlreadySubmitted?.response_text ?? "")
    const [fileToUpload, setFileToUpload] = useState<File>()
    const [showUploadBtn, setShowUploadBtn] = useState(false)
    const { search } = useLocation()
    useEffect(() => {
        const qp = new URLSearchParams(search)
        if (!!qp.get("allow_upload")) {
            setShowUploadBtn(true)
        }
    }, [search])
	const submit = useCallback(async () => {
        if (canvasRef.current) {
            setSubmitting(true)
            let canvasDataURL: string | undefined = undefined
            let canvasUploadedURL: string | undefined = undefined
            if (fileToUpload) {
                const blob = fileToUpload.slice(0, fileToUpload.size, 'image/png'); 
                const fileForUpload = new File([blob], `drawing-${Date.now()}.png`, {type: 'image/png'});
                canvasUploadedURL = await uploadFile(fileForUpload, `${lesson.teacher_email}/student-responses`)
            } else {
                canvasDataURL = canvasRef.current.toDataURL()
                console.log(canvasDataURL)
                const file = await urlToFile(canvasDataURL!, `drawing-${Date.now()}.png`)
                canvasUploadedURL = await uploadFile(file, `${lesson.teacher_email}/student-responses`)
            }
    
            submitResponse({
                id: v4(),
                question_id: question.id,
                lesson_id: lesson.id,
                teacher_email: question.teacher_email,
                student_id: student.id,
                student_name: student.nickname,
                created_at: new Date().toISOString(),
                ...responseAlreadySubmitted,
                response_text: typedInput,
                response_image_url: canvasUploadedURL,
                response_has_drawing: responseHasDrawing || !!fileToUpload,
                updated_at: new Date().toISOString(),
            }).then(() => {
                setSubmitted(true)
                if (containerRef.current) {
                    containerRef.current.style.cursor = "not-allowed"
                    containerRef.current.style.pointerEvents = "none"
                }
            })
        }
	}, [containerRef.current, canvasRef.current, typedInput, fileToUpload])

    return <section style={{ padding: "0" }}>
        <h2>{question.body_text}</h2>
        <div style={{ textAlign: "center" }}>
            {question.media_content_urls?.map(imgSrc =>
                <img key={imgSrc}
                    src={imgSrc}
                    alt="Media content -- ask your teacher if you aren't able to view it"
                    style={{ maxWidth: "100%" }}
                />
            )}
        </div>
        <div style={{ maxWidth: "1000px", marginTop: "40px" }}>
            <p>You may type and/or draw your response. Anything you type or draw will be submitted.</p>
            {/* <div style={{ display: "flex", gap: "20px", paddingBottom: "10px" }}>
                <button onClick={() => setWhichInputShown("type")}
                    style={{ opacity: whichInputShown === "type" ? 1 : 0.5 }}>
                    <FontAwesomeIcon icon={faKeyboard} />&nbsp;
                    Type
                </button>
                <button onClick={() => setWhichInputShown("draw")}
                    style={{ opacity: whichInputShown === "draw" ? 1 : 0.5 }}>
                    <FontAwesomeIcon icon={faHandPointer} />&nbsp;
                    Draw
                </button>
            </div> */}
            <textarea
                id="typed-input"
                name="typed-input"
                className="response-input"
                placeholder="Type your response here..."
                disabled={submitting || submitted}
                value={typedInput}
                onInput={(e) => setTypedInput((e.target as HTMLInputElement).value)}
                style={{ width: "100%", height: "100px" }}
            />
            <div>
                <div style={{ maxWidth: "1000px" }}>
                    {responseAlreadySubmitted
                        && <div>
                            {responseAlreadySubmitted.response_image_base64
                                ? <div style={{ width: "100%", background: "#fff" }}><img src={responseAlreadySubmitted.response_image_base64} style={{ width: "100%" }} /></div>
                                : responseAlreadySubmitted.response_image_url
                                ? <div style={{ width: "100%", background: "#fff" }}><img src={responseAlreadySubmitted.response_image_url} style={{ width: "100%" }} /></div>
                                : <p>You did not submit a drawing</p>
                            }
                        </div>
                    }
                    {<div style={{ marginTop: "50px" }}>
                        <p>Draw your response in the box below</p>
                        <CanvasInput id={question.id}
                            canvasRef={canvasRef}
                            containerRef={containerRef}
                            onDraw={() => setResponseHasDrawing(true)}
                            onClear={() => {
                                setResponseHasDrawing(false)
                                // TODO: Clear response_image_url value too?
                            }}
                        />
                    </div>}
                </div>
            </div>
            {showUploadBtn && <div>
                <p>Upload</p>
                <input type="file"
                    multiple={false}
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                            console.log("set file to upload", file)
                            setFileToUpload(file)
                        }
                    }}
                />
            </div>}
        </div>
        <div style={{ maxWidth: "1000px", marginTop: "25px" }}>
            <button className="large-button" onClick={() => submit()}
                // disabled={submitting || submitted || !!responseAlreadySubmitted}
                disabled={submitting || submitted}
            >
                {(!submitting && !submitted)
                    ? "Submit"
                    : !submitted
                    ? "Submitting..."
                    : "Submitted!"}
            </button>
        </div>
    </section>
}

export default LessonQuestionForStudent
