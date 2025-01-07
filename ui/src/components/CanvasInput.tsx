import { faTrashCan } from "@fortawesome/free-regular-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import CanvasFreeDrawing from "canvas-free-drawing"
import { throttle } from "lodash"
import { FC, MutableRefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

export interface CanvasInputProps {
	canvasRef: MutableRefObject<HTMLCanvasElement | null>
	containerRef: MutableRefObject<HTMLDivElement | null>
	onDraw: () => void
	onClear: () => void
}

const CanvasInput: FC<CanvasInputProps> = ({ canvasRef, containerRef, onDraw, onClear }) => {
	const ctx = useRef<CanvasRenderingContext2D>()
	const flag = useRef(false)
	const prevX = useRef(0)
	const currX = useRef(0)
	const prevY = useRef(0)
	const currY = useRef(0)
	const dotFlag = useRef(false)
	const w = useRef(0)
	const h = useRef(0)
	const color = useRef("black")
	const lineWidth = useRef(2)
	useEffect(() => {}, [canvasRef.current])
	useEffect(() => {
		const canvas = canvasRef.current
		if (canvas) {
			ctx.current = canvas.getContext("2d")!
			w.current = canvas.width
			h.current = canvas.height

			canvas.addEventListener(
				"mousemove",
				function (e) {
					findxy("move", e)
				},
				false,
			)
			canvas.addEventListener(
				"mousedown",
				function (e) {
					findxy("down", e)
				},
				false,
			)
			canvas.addEventListener(
				"mouseup",
				function (e) {
					findxy("up", e)
				},
				false,
			)
			canvas.addEventListener(
				"mouseout",
				function (e) {
					findxy("out", e)
				},
				false,
			)
		}
	}, [canvasRef.current])
	const draw = useCallback(() => {
		if (ctx.current) {
			onDraw()
			ctx.current.beginPath()
			ctx.current.moveTo(prevX.current, prevY.current)
			ctx.current.lineTo(currX.current, currY.current)
			ctx.current.strokeStyle = color.current
			ctx.current.lineWidth = lineWidth.current
			ctx.current.stroke()
			ctx.current.closePath()
		}
	}, [ctx.current, prevX.current, currX.current, prevY.current, currY.current, color.current, lineWidth.current])
	const findxy = useCallback(
		throttle((res: "move" | "down" | "up" | "out", e: MouseEvent) => {
			const canvas = canvasRef.current
			const container = containerRef.current
			if (canvas && container && res == "down") {
				prevX.current = currX.current
				prevY.current = currY.current
				currX.current = e.clientX - canvas.offsetLeft - container.getBoundingClientRect().left
				currY.current = e.clientY - canvas.offsetTop - container.getBoundingClientRect().top

				flag.current = true
				dotFlag.current = true
				if (ctx.current && dotFlag) {
					ctx.current.beginPath()
					ctx.current.fillStyle = color.current
					ctx.current.fillRect(currX.current, currY.current, 2, 2)
					ctx.current.closePath()
					dotFlag.current = false
				}
			}
			if (res == "up" || res == "out") {
				flag.current = false
			}
			if (res == "move" && canvas && container && flag.current) {
				prevX.current = currX.current
				prevY.current = currY.current
				currX.current = e.clientX - canvas.offsetLeft - container.getBoundingClientRect().left
				currY.current = e.clientY - canvas.offsetTop - container.getBoundingClientRect().top
				draw()
			}
		}, 10),
		[canvasRef.current, flag.current, dotFlag.current, draw],
	)
	const clearAll = useCallback(() => {
		const m = confirm("Are you sure?")
		if (canvasRef.current && ctx.current && m) {
			ctx.current.clearRect(0, 0, w.current, h.current)
		}
		onClear()
	}, [ctx.current, w.current, h.current])
	

	// const canvRef = useRef<HTMLCanvasElement | null>(null)
	// const [cfd, setCfd] = useState<CanvasFreeDrawing | null>(null)
	// useEffect(() => {
	// 	if (canvRef.current) {
	// 		setCfd(new CanvasFreeDrawing({
	// 			elementId: "cfd",
	// 			width: 1000,
	// 			height: 700,
	// 			showWarnings: true
	// 		}))
	// 	}
	// }, [canvRef.current])
	// const clearAll = useCallback(() => {
	// 	if (cfd) {
	// 		cfd.clear()
	// 	}
	// 	onClear()
	// }, [cfd])

	return (
		<>
			<div id="canvas-container"
				ref={containerRef}
				style={{
					position: "relative",
				}}
			>
				<div
					style={{
						overflow: "hidden",
						borderRadius: "15px",
						height: "700px",
					}}
				>
					<canvas
						id="cfd"
						ref={canvasRef}
						width={1000}
						height={700}
						style={{
							background: "white",
						}}
					/>
				</div>
				{/* <canvas
					id="cfd"
					ref={canvasRef}
				/> */}
				<div
					style={{
						position: "absolute",
						top: "-33px",
						width: "100%",
						textAlign: "right",
					}}
				>
					<button onClick={() => clearAll()}
						style={{
							fontSize: "12px",
						}}>
						<FontAwesomeIcon icon={faTrashCan} />&nbsp;
						Clear and start over
					</button>
				</div>
				<div className="color-and-stroke" style={{ display: "flex", gap: "40px", alignItems: "center" }}>
					<div className="stroke-width-select" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
						{[4, 8, 12, 24, 36].map((width) => (
							<button key={`${width}`}
								onClick={() => {
									lineWidth.current = width
									// cfd?.setLineWidth(width)
								}}
								style={{
									width: (width * 1.5) + "px",
									height: (width * 1.5) + "px",
									borderRadius: "50%",
									background: "#eee",
									border: "none",
								}}
							/>
						))}
					</div>
					<div className="color-select">
						{[
							  [231, 214, 206],[166, 152, 168],[80, 194, 54],[21, 133, 111],[35, 78, 0],
							  [247, 246, 182],[239, 195, 6],[167, 85, 66],[2, 85, 147],[67, 68, 129],
							  [254, 108, 83],[241, 46, 56],[216, 35, 83],[235, 139, 142],[181, 31, 143],
						].map(c => (
							<button key={JSON.stringify(c)}
								onClick={() => {
									color.current = `rgb(${c.join(",")})`
									// cfd?.setDrawingColor(c)
								}}
								style={{
									background: `rgb(${c.join(",")})`,
									width: "25px",
									height: "25px",
									border: "1px solid black",
								}}
							/>
						))}
					</div>
				</div>
			</div>
		</>
	)
}

export default CanvasInput
