import { FC } from "react"

const AppForStudents: FC = () => {
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
				</div>
			</div>
		</div>
	)
}

export default AppForStudents
