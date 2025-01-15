import { createRef, FC, MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import { LessonQuestion, LessonQuestionAnalysis, LessonResponse } from "../data-model";
import { parseISO } from "date-fns";
import dragula from "react-dragula";
import { faGripLines } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export interface LessonQuestionResponsesProps {
    analysis: LessonQuestionAnalysis
    onReorderResponse: (responseId: string, oldCatName: string, newCatName: string) => void
}

const LessonQuestionResponses: FC<LessonQuestionResponsesProps> = ({ analysis, onReorderResponse }) => {
    const responsesByCatName = useMemo(() => analysis.responses_by_category, [analysis.responses_by_category])
    const [responsesByCatNameCtrl, setResponsesByCatNameCtrl] = useState<{ catName: string, responses: LessonResponse[] }[]>()
    useEffect(() => {
        setResponsesByCatNameCtrl(
            Object.entries(responsesByCatName).map(([k, v]) => ({
                catName: k,
                responses: v,
            }))
        )
        if (!containerRefsByCatName.current) {
            containerRefsByCatName.current = Object.keys(responsesByCatName).reduce(
                (acc, catName) => {
                    acc[catName] = createRef() as MutableRefObject<HTMLDivElement>
                    return acc
                },
                {} as Record<string, MutableRefObject<HTMLDivElement>>,
            )
        }
    }, [responsesByCatName])
    const containerRefsByCatName = useRef<Record<string, MutableRefObject<HTMLDivElement>>>()
    useEffect(() => {
        if (containerRefsByCatName.current) {
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
                const oldCatName = Object.keys(responsesByCatName).find((catName) => responsesByCatName[catName].find((r) => r.student_name === studentName)) ?? ""
                const response = responsesByCatName[oldCatName].find((r) => r.student_name === studentName)!
                onReorderResponse(response.id, oldCatName, newCatName)
            })
        }
    }, [containerRefsByCatName.current, responsesByCatNameCtrl])

    return <div className="question-responses" style={{ marginTop: "40px" }}>

        <hr />
        <h2>Responses by category</h2>
    
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
                {containerRefsByCatName.current && <div className="response-category-responses"
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
                                    <b>{r.student_name}</b>
                                    &nbsp;
                                    <small>submitted at {parseISO(r.created_at).toLocaleString()}</small>
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
                                {r.response_image_url &&
                                    <div style={{ height: "200px", flexBasis: "300px", minWidth: "300px" }}>
                                        <img src={r.response_image_url} alt={r.analysis!.response_summary} style={{ width: "100%", height: "auto" }} />
                                    </div>
                                }
                                <p style={{ fontSize: "1.1rem" }}>{r.analysis!.response_summary}</p>
                            </div>
                        </div>
                    )}
                </div>}

                <hr style={{ marginTop: "40px", marginBottom: "-10px" }} />
            </div>
        )}
    
    </div>
}

export default LessonQuestionResponses
