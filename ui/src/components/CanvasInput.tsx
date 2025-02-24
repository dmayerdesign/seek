import { faTrashCan } from "@fortawesome/free-regular-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import CanvasFreeDrawing, { AllowedEvents } from "./canvas-free-drawing-fork"
// import CanvasFreeDrawing, { AllowedEvents } from "canvas-free-drawing"
import { throttle } from "lodash"
import { FC, MutableRefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

export interface CanvasInputProps {
	id: string
	canvasRef: MutableRefObject<HTMLCanvasElement | null>
	containerRef: MutableRefObject<HTMLDivElement | null>
	onDraw: () => void
	onClear: () => void
}

const CanvasInput: FC<CanvasInputProps> = ({ id, canvasRef, containerRef, onDraw, onClear }) => {
	// const ctx = useRef<CanvasRenderingContext2D>()
	// const flag = useRef(false)
	// const prevX = useRef(0)
	// const currX = useRef(0)
	// const prevY = useRef(0)
	// const currY = useRef(0)
	// const dotFlag = useRef(false)
	// const w = useRef(0)
	// const h = useRef(0)
	// const color = useRef("black")
	// const lineWidth = useRef(2)
	// useEffect(() => {}, [canvasRef.current])
	// useEffect(() => {
	// 	const canvas = canvasRef.current
	// 	if (canvas) {
	// 		ctx.current = canvas.getContext("2d")!
	// 		w.current = canvas.width
	// 		h.current = canvas.height

	// 		canvas.addEventListener(
	// 			"mousemove",
	// 			function (e) {
	// 				findxy("move", e)
	// 			},
	// 			false,
	// 		)
	// 		canvas.addEventListener(
	// 			"mousedown",
	// 			function (e) {
	// 				findxy("down", e)
	// 			},
	// 			false,
	// 		)
	// 		canvas.addEventListener(
	// 			"mouseup",
	// 			function (e) {
	// 				findxy("up", e)
	// 			},
	// 			false,
	// 		)
	// 		canvas.addEventListener(
	// 			"mouseout",
	// 			function (e) {
	// 				findxy("out", e)
	// 			},
	// 			false,
	// 		)
	// 	}
	// }, [canvasRef.current])
	// const draw = useCallback(() => {
	// 	if (ctx.current) {
	// 		onDraw()
	// 		ctx.current.beginPath()
	// 		ctx.current.moveTo(prevX.current, prevY.current)
	// 		ctx.current.lineTo(currX.current, currY.current)
	// 		ctx.current.strokeStyle = color.current
	// 		ctx.current.lineWidth = lineWidth.current
	// 		ctx.current.stroke()
	// 		ctx.current.closePath()
	// 	}
	// }, [ctx.current, prevX.current, currX.current, prevY.current, currY.current, color.current, lineWidth.current])
	// const findxy = useCallback(
	// 	throttle((res: "move" | "down" | "up" | "out", e: MouseEvent) => {
	// 		const canvas = canvasRef.current
	// 		const container = containerRef.current
	// 		if (canvas && container && res == "down") {
	// 			prevX.current = currX.current
	// 			prevY.current = currY.current
	// 			currX.current = e.clientX - canvas.offsetLeft - container.getBoundingClientRect().left
	// 			currY.current = e.clientY - canvas.offsetTop - container.getBoundingClientRect().top

	// 			flag.current = true
	// 			dotFlag.current = true
	// 			if (ctx.current && dotFlag) {
	// 				ctx.current.beginPath()
	// 				ctx.current.fillStyle = color.current
	// 				ctx.current.fillRect(currX.current, currY.current, 2, 2)
	// 				ctx.current.closePath()
	// 				dotFlag.current = false
	// 			}
	// 		}
	// 		if (res == "up" || res == "out") {
	// 			flag.current = false
	// 		}
	// 		if (res == "move" && canvas && container && flag.current) {
	// 			prevX.current = currX.current
	// 			prevY.current = currY.current
	// 			currX.current = e.clientX - canvas.offsetLeft - container.getBoundingClientRect().left
	// 			currY.current = e.clientY - canvas.offsetTop - container.getBoundingClientRect().top
	// 			draw()
	// 		}
	// 	}, 10),
	// 	[canvasRef.current, flag.current, dotFlag.current, draw],
	// )
	// const clearAll = useCallback(() => {
	// 	const m = confirm("Are you sure?")
	// 	if (canvasRef.current && ctx.current && m) {
	// 		ctx.current.clearRect(0, 0, w.current, h.current)
	// 	}
	// 	onClear()
	// }, [ctx.current, w.current, h.current])

	const [cfd, setCfd] = useState<CanvasFreeDrawing | null>(null)
	const [color, setColor] = useState("rgb(0,0,0)")
	useEffect(() => {
		if (canvasRef.current) {
			const _cfd = new CanvasFreeDrawing({
				elementId: id + "_cfd",
				width: 1000,
				height: 700,
				showWarnings: true,
			})
			_cfd.strokeColor = [0, 0, 0]
			_cfd.lineWidth = 4
			_cfd.on({ event: AllowedEvents.redraw }, () => {
				// console.log("CanvasFreeDrawing redraw")
				onDraw()
			})
			_cfd.on({ event: AllowedEvents.mousedown }, () => {
				// console.log("CanvasFreeDrawing mousedown")
			})
			setCfd(_cfd)
			console.log("CanvasFreeDrawing did initialize", _cfd)
		}
	}, [canvasRef.current])
	const clearAll = useCallback(() => {
		if (cfd) {
			cfd.clear()
		}
		onClear()
	}, [cfd])

	return (
		<>
			<div
				id="canvas-container"
				ref={containerRef}
				style={{
					position: "relative",
					// height: "700px",
				}}
			>
				<div
					className="color-and-stroke"
					style={{ display: "flex", gap: "40px", alignItems: "center", padding: "15px 0" }}
				>
					<div className="stroke-width-select" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
						{[4, 8, 12, 24, 36, 48, 72].map((width) => (
							<button
								key={`${width}`}
								onClick={() => {
									// lineWidth.current = width
									cfd?.setLineWidth(width)
								}}
								style={{
									width: width * 1.1 + "px",
									height: width * 1.1 + "px",
									borderRadius: "50%",
									// background: "#eee",
									background: color,
									border: "none",
								}}
							/>
						))}
					</div>
					<div className="color-select">
						{[
							[0, 0, 0], // Black (text, outlines)
							[255, 255, 255], // White (background, highlights)
							[255, 69, 0], // Bright Red-Orange (temperature, heat)
							[255, 80, 80], // Alert Red (warnings, heat, biological emphasis)
							[200, 50, 50], // Dark Red (danger, heat maps)
							[255, 150, 0], // Orange (caution, transitions)
							[255, 200, 0], // Golden Yellow (energy, light, important highlights)
							[255, 255, 160], // Soft Yellow (subtle highlights, background)
							[50, 205, 50], // Lime Green (plant life, biology)
							[0, 200, 0], // Green (biology, environment, life sciences)
							[140, 70, 20], // Earth Brown (geology, natural elements)
							[210, 180, 140], // Tan (earth sciences, sedimentary layers)
							[90, 200, 250], // Cyan Blue (cool elements, water, atmosphere)
							[30, 144, 255], // Dodger Blue (water, atmospheric elements)
							[0, 150, 255], // Science Blue (general emphasis)
							[70, 70, 255], // Strong Blue (electricity, high energy)
							[0, 0, 128], // Deep Navy Blue (depth, space, structure)
							[80, 0, 160], // Deep Violet (contrast, advanced concepts)
							[75, 0, 130], // Indigo (deep space, physics, theoretical concepts)
							[190, 90, 255], // Purple (mystery, deep space, chemistry)
							[255, 110, 180], // Pink (biological emphasis, cells, organic matter)
							[255, 240, 230], // Soft Off-White (background variation)
							[245, 222, 179], // Wheat (neutral backgrounds)
							[160, 160, 160], // Neutral Gray (for balance, shading)
							[169, 169, 169], // Dark Gray (structural elements, shadows)
						].map((c) => (
							<button
								key={JSON.stringify(c)}
								onClick={() => {
									setColor(`rgb(${c.join(",")})`)
									cfd?.setDrawingColor(c)
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
				<div
					style={{
						overflow: "hidden",
						borderRadius: "15px",
						// height: "700px",
					}}
				>
					{/* <canvas
						id={id + "_cfd"}
						ref={canvasRef}
						width={1000}
						height={700}
						style={{
							background: "white",
						}}
					/> */}
					<canvas id={id + "_cfd"} ref={canvasRef} />
				</div>
				<div
					style={{
						position: "absolute",
						zIndex: 100,
						bottom: 700 - 25 + "px",
						right: "15px",
						textAlign: "right",
					}}
				>
					<button
						onClick={() => {
							if (window.confirm("Erase your drawing and start over? This cannot be undone.")) {
								clearAll()
							}
						}}
						style={{
							fontSize: "12px",
						}}
					>
						<FontAwesomeIcon icon={faTrashCan} style={{ color: "#222" }} />
						&nbsp;
						<b style={{ color: "#222" }}>Clear drawing</b>
					</button>
				</div>
			</div>
		</>
	)
}

export default CanvasInput
