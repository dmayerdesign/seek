import { createRef, FC, MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import { LessonQuestion, LessonQuestionAnalysis, LessonResponse } from "../data-model";
import { parseISO } from "date-fns";
import dragula from "dragula";
import { faGripLines } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export interface LessonQuestionResponsesProps {
    analysis: LessonQuestionAnalysis
    onAnalysisChange: (newAnalysis: LessonQuestionAnalysis) => void
}

const LessonQuestionResponses: FC<LessonQuestionResponsesProps> = ({ analysis, onAnalysisChange }) => {
    const responsesByCatName = useMemo(() => analysis.responses_by_category, [analysis.responses_by_category])
    const [responsesByCatNameCtrl, setResponsesByCatNameCtrl] = useState<{ catName: string, responses: LessonResponse[] }[]>()
    useEffect(() => {
        setResponsesByCatNameCtrl(
            Object.entries(responsesByCatName).map(([k, v]) => ({
                catName: k,
                responses: v,
            }))
        )
    }, [responsesByCatName])
    const containerRefsByCatName = useRef<Record<string, MutableRefObject<HTMLDivElement>>>(Object.keys(responsesByCatName).reduce(
        (acc, catName) => {
            acc[catName] = createRef() as MutableRefObject<HTMLDivElement>
            return acc
        },
        {} as Record<string, MutableRefObject<HTMLDivElement>>,
    ))
    useEffect(() => {
        console.log(containerRefsByCatName.current)
        dragula(
            Object.values(containerRefsByCatName.current).map(ref => ref.current),
            {
                moves: (el, container, handle, sibling) => {
                    return !!handle?.classList.contains("drag-handle")
                },
            },
        ).on("drop", (el, source) => {
            const newCatName = source.getAttribute("data-cat-name")!
            const studentName = el.getAttribute("data-student-name")!
            const newAnalysis = { ...analysis }
            newAnalysis.responses_by_category = { ...responsesByCatName }
            const oldCatName = Object.keys(responsesByCatName).find((catName) => responsesByCatName[catName].find((r) => r.student_name === studentName)) ?? ""
            const response = responsesByCatName[oldCatName].find((r) => r.student_name === studentName)!
            newAnalysis.responses_by_category[oldCatName!] = responsesByCatName[oldCatName!].filter((r) => r.student_name !== studentName)
            newAnalysis.responses_by_category[newCatName] = [
                ...newAnalysis.responses_by_category[newCatName],
                response,
            ]
            onAnalysisChange(newAnalysis)
        })
    }, [containerRefsByCatName.current])

    return <div className="question-responses">
    
        {responsesByCatNameCtrl?.map(({catName, responses}) =>
            <div key={catName} className="response-category"
                style={{
                    marginTop: "40px"
                }}>
                <h4>
                    {catName}
                    {/* <input className="inline-input"
                        style={{ width: "100%" }}
                        value={catName}
                        onChange={(e) => {
                            const newCatName = e.target.value
                            const newAnalysis = { ...analysis }
                            newAnalysis.responses_by_category = {
                                ...responsesByCatName,
                                [newCatName]: newAnalysis.responses_by_category[catName]
                            }
                            delete newAnalysis.responses_by_category[catName]
                            setResponsesByCatNameCtrl(
                                Object.entries(newAnalysis.responses_by_category).map(([k, v]) => ({
                                    catName: k,
                                    responses: v,
                                }))
                            )
                            
                            // onAnalysisChange(newAnalysis)

                            containerRefsByCatName.current[newCatName] = containerRefsByCatName.current[catName]
                            delete containerRefsByCatName.current[catName]
                        }}
                    /> */}
                </h4>
                <div className="response-category-responses"
                    key={catName}
                    data-cat-name={catName}
                    ref={containerRefsByCatName.current[catName]}
                    style={{
                        minHeight: "100px",
                    }}>
                    {responses.map((r) =>
                        <div className="student-response"
                            key={r.student_name}
                            data-student-name={r.student_name}
                            style={{
                                marginBottom: "10px",
                                padding: "20px",
                                borderRadius: "10px",
                                background: "#fff",
                            }}
                        >
                            <p style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginTop: 0,
                            }}>
                                <span>
                                    <b>{r.student_name} submitted</b>
                                    &nbsp;
                                    <small>at {parseISO(r.created_at).toLocaleString()}</small>
                                </span>
                                <span style={{ cursor: "grab" }} className="drag-handle">
                                    <FontAwesomeIcon icon={faGripLines}
                                        style={{ pointerEvents: "none" }}
                                    />
                                </span>
                            </p>
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "20px",
                            }}>
                                {r.response_image_base64 &&
                                    <img src={r.response_image_base64} alt={r.analysis!.response_summary}
                                        style={{ height: "200px" }}
                                    />
                                }
                                <p>{r.analysis!.response_summary}</p>
                            </div>
                        </div>
                    )}
                </div>

                <hr style={{ marginTop: "40px", marginBottom: "-10px" }} />
            </div>
        )}
    
    </div>
}

export default LessonQuestionResponses
