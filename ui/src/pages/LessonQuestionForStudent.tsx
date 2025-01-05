import { FC, useCallback, useMemo, useRef, useState } from "react";
import { LessonQuestion, LessonResponse, LessonWithResponses, Student } from "../data-model";
import CanvasInput from "../components/CanvasInput";
import { v4 } from "uuid";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHandPointer, faKeyboard } from "@fortawesome/free-regular-svg-icons";


export interface LessonQuestionForStudentProps {
    lesson: LessonWithResponses
    student: Student
    question: LessonQuestion
    submitResponse: (response: LessonResponse) => Promise<void>
}

const LessonQuestionForStudent: FC<LessonQuestionForStudentProps> = ({ lesson, student, question, submitResponse }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const responseAlreadySubmitted = useMemo(() => lesson.responses?.find(r => r.student_id === student.id), [lesson, student])
    const [responseIsDrawn, setResponseIsDrawn] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(!!responseAlreadySubmitted)
	const [typedInput, setTypedInput] = useState(responseAlreadySubmitted?.response_text ?? "")
	const submit = useCallback(() => {
        setSubmitting(true)

        let canvasDataURL: string | undefined = undefined
		if (canvasRef.current) {
			canvasDataURL = canvasRef.current.toDataURL()
			console.log(canvasDataURL)
		}

        submitResponse({
            id: v4(),
            question_id: question.id,
            lesson_id: lesson.id,
            teacher_email: question.teacher_email,
            student_id: student.id,
            student_name: student.nickname,
            response_text: typedInput,
            response_image_base64: canvasDataURL,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).then(() => {
            setSubmitted(true)
            if (containerRef.current) {
                containerRef.current.style.cursor = "not-allowed"
                containerRef.current.style.pointerEvents = "none"
            }
        })
	}, [containerRef.current, canvasRef.current, typedInput])

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
        <div style={{ maxWidth: "600px", marginTop: "40px" }}>
            <div style={{ display: "flex", gap: "20px", paddingBottom: "10px" }}>
                <button onClick={() => setResponseIsDrawn(false)}
                    style={{ opacity: responseIsDrawn ? 0.5 : 1 }}>
                    <FontAwesomeIcon icon={faKeyboard} />&nbsp;
                    Type
                </button>
                <button onClick={() => setResponseIsDrawn(true)}
                    style={{ opacity: responseIsDrawn ? 1 : 0.5 }}>
                    <FontAwesomeIcon icon={faHandPointer} />&nbsp;
                    Draw
                </button>
            </div>
            {!responseIsDrawn
            ? <textarea
                id="typed-input"
                name="typed-input"
                className="response-input"
                placeholder="Type your response here..."
                disabled={submitting || submitted}
                value={typedInput}
                onInput={(e) => setTypedInput((e.target as HTMLInputElement).value)}
                style={{ width: "100%", height: "100px" }}
            />
            : <div>
                <p>Draw your response in the box below</p>
                <div style={{ maxWidth: "600px" }}>
                    <CanvasInput canvasRef={canvasRef} containerRef={containerRef} />
                </div>
            </div>}
        </div>
        <div style={{ maxWidth: "600px", marginTop: "25px" }}>
            <button className="large-button" onClick={submit}
                disabled={submitting || submitted}>
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
