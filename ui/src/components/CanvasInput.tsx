import { FC, MutableRefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";

export interface CanvasInputProps {
    canvasRef: MutableRefObject<HTMLCanvasElement | null>
}

const CanvasInput: FC<CanvasInputProps> = ({ canvasRef }) => {
    // const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
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
    useEffect(() => {
    }, [canvasRef.current])
	useEffect(() => {
        const canvas = canvasRef.current
		if (canvas) {
			ctx.current = canvas.getContext("2d")!
			w.current = canvas.width
			h.current = canvas.height
		
			canvas.addEventListener("mousemove", function (e) {
				findxy('move', e)
			}, false);
			canvas.addEventListener("mousedown", function (e) {
				findxy('down', e)
			}, false);
			canvas.addEventListener("mouseup", function (e) {
				findxy('up', e)
			}, false);
			canvas.addEventListener("mouseout", function (e) {
				findxy('out', e)
			}, false);
		}
	}, [canvasRef.current])
	const draw = useCallback(() => {
        console.log("decided to draw", ctx.current)
		if (ctx.current) {
			ctx.current.beginPath();
			ctx.current.moveTo(prevX.current, prevY.current);
			ctx.current.lineTo(currX.current, currY.current);
			ctx.current.strokeStyle = color.current;
			ctx.current.lineWidth = lineWidth.current;
			ctx.current.stroke();
			ctx.current.closePath();
		}
	}, [
		ctx.current,
		prevX.current,
		currX.current,
		prevY.current,
		currY.current,
		color.current,
		lineWidth.current,
	])
	const findxy = useCallback((res: "move"|"down"|"up"|"out", e: MouseEvent) => {
        const canvas = canvasRef.current
        const container = containerRef.current
		if (canvas && container && res == 'down') {
			prevX.current = currX.current;
			prevY.current = currY.current;
			currX.current = e.clientX - canvas.offsetLeft - container.offsetLeft;
			currY.current = e.clientY - canvas.offsetTop - container.offsetTop;
	
			flag.current = true;
			dotFlag.current = true;
			if (ctx.current && dotFlag) {
				ctx.current.beginPath();
				ctx.current.fillStyle = color.current;
				ctx.current.fillRect(currX.current, currY.current, 2, 2);
				ctx.current.closePath();
				dotFlag.current = false;
			}
		}
		if (res == 'up' || res == "out") {
			flag.current = false;
		}
		if (res == 'move' && canvas && container && flag.current) {
			prevX.current = currX.current;
			prevY.current = currY.current;
			currX.current = e.clientX - canvas.offsetLeft - container.offsetLeft;
			currY.current = e.clientY - canvas.offsetTop - container.offsetTop;
			draw()
		}
	}, [
		canvasRef.current,
		flag.current,
		dotFlag.current,
		draw,
	])
	const changeColor = useCallback((obj: HTMLElement) => {
		switch (obj.id) {
			case "green":
				color.current = "green";
				break;
			case "blue":
				color.current = "blue";
				break;
			case "red":
				color.current = "red";
				break;
			case "yellow":
				color.current = "yellow";
				break;
			case "orange":
				color.current = "orange";
				break;
			case "black":
				color.current = "black";
				break;
			case "white":
				color.current = "white";
				break;
		}
		if (color.current == "white") lineWidth.current = 14;
		else lineWidth.current = 2;
	}, [color.current, lineWidth.current])
	const clearAll = useCallback(() => {
		const m = confirm("Are you sure?");
		if (canvasRef.current && ctx.current && m) {
			ctx.current.clearRect(0, 0, w.current, h.current)
		}
	}, [ctx.current, w.current, h.current])

    return <>
        <div ref={containerRef}
            style={{
                position: "relative",
            }}>
            <div style={{
                overflow: "hidden",
                borderRadius: "15px",
                height: "500px",
            }}>
                <canvas ref={canvasRef} width={600} height={500} style={{
                    background: "white",
                }} />
            </div>
            <div style={{
                marginTop: "10px",
                width: "100%",
                textAlign: "center",
            }}>
                <button onClick={() => clearAll()}>
                    Clear and start over
                </button>
            </div>
        </div>
    </>
    
}

export default CanvasInput
