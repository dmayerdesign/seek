import { FC, useCallback, useLayoutEffect, useRef } from "react"

const AppForStudents: FC = () => {
	const canvas = useRef<HTMLCanvasElement>(null)
	const ctx = useRef<CanvasRenderingContext2D>()
	const flag = useRef(false)
	const prevX = useRef(0)
	const currX = useRef(0)
	const prevY = useRef(0)
	const currY = useRef(0)
	const dot_flag = useRef(false)
	const w = useRef(0)
	const h = useRef(0)
	const x = useRef("black")
	const y = useRef(2)

	useLayoutEffect(() => {
		if (canvas.current) {
			ctx.current = canvas.current.getContext("2d")!
			w.current = canvas.current.width
			h.current = canvas.current.height
		
			canvas.current.addEventListener("mousemove", function (e) {
				findxy('move', e)
			}, false);
			canvas.current.addEventListener("mousedown", function (e) {
				findxy('down', e)
			}, false);
			canvas.current.addEventListener("mouseup", function (e) {
				findxy('up', e)
			}, false);
			canvas.current.addEventListener("mouseout", function (e) {
				findxy('out', e)
			}, false);
		}
	}, [canvas.current])

	const draw = useCallback(() => {
		if (ctx.current) {
			ctx.current.beginPath();
			ctx.current.moveTo(prevX.current, prevY.current);
			ctx.current.lineTo(currX.current, currY.current);
			ctx.current.strokeStyle = x.current;
			ctx.current.lineWidth = y.current;
			ctx.current.stroke();
			ctx.current.closePath();
		}
	}, [
		ctx.current,
		prevX.current,
		currX.current,
		prevY.current,
		currY.current,
		x.current,
		y.current,
	])

	const findxy = useCallback((res: "move"|"down"|"up"|"out", e: MouseEvent) => {
		if (canvas.current && res == 'down') {
			prevX.current = currX.current;
			prevY.current = currY.current;
			currX.current = e.clientX - canvas.current.offsetLeft;
			currY.current = e.clientY - canvas.current.offsetTop;
	
			flag.current = true;
			dot_flag.current = true;
			if (ctx.current && dot_flag) {
				ctx.current.beginPath();
				ctx.current.fillStyle = x.current;
				ctx.current.fillRect(currX.current, currY.current, 2, 2);
				ctx.current.closePath();
				dot_flag.current = false;
			}
		}
		if (res == 'up' || res == "out") {
			flag.current = false;
		}
		if (res == 'move' && canvas.current && flag.current) {
			prevX.current = currX.current;
			prevY.current = currY.current;
			currX.current = e.clientX - canvas.current.offsetLeft;
			currY.current = e.clientY - canvas.current.offsetTop;
			draw()
		}
	}, [
		canvas.current,
		flag.current,
		dot_flag.current,
		draw,
	])

	const changeColor = useCallback((obj: HTMLElement) => {
		switch (obj.id) {
			case "green":
				x.current = "green";
				break;
			case "blue":
				x.current = "blue";
				break;
			case "red":
				x.current = "red";
				break;
			case "yellow":
				x.current = "yellow";
				break;
			case "orange":
				x.current = "orange";
				break;
			case "black":
				x.current = "black";
				break;
			case "white":
				x.current = "white";
				break;
		}
		if (x.current == "white") y.current = 14;
		else y.current = 2;
	}, [x.current, y.current])

	const clearAll = useCallback(() => {
		const m = confirm("Are you sure?");
		if (canvas.current && ctx.current && m) {
			ctx.current.clearRect(0, 0, w.current, h.current)
		}
	}, [ctx.current, w.current, h.current])

	return (
		<div className="dark">
			<header>
				<div className="page-content">
					<img
						src="/seek-logo-light.png"
						className="seek-logo"
						style={{ height: "18px", width: "auto" }}
						alt="SEEK"
					/>
				</div>
			</header>
			<div className="seek-page">
				<div className="page-content">
					<h2>For Students</h2>

					<section>
						<div>
							<canvas ref={canvas} style={{ background: "white" }} />
						</div>
						<button onClick={() => clearAll()}>Clear all</button>
					</section>
				</div>
			</div>
		</div>
	)
}

export default AppForStudents
