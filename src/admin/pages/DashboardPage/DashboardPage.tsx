import { h } from "preact";
import SPages from "../../styles/pages.module.less";


export function DashboardPage ( props ) {
	return <div>
		<div class={ SPages._header }>
			<h2>Admin Dashboard</h2>
		</div>
		<ul>
			<li>Work in progress</li>
			<li>See documentation</li>
		</ul>
	</div>
}