import { h, Fragment } from "preact";
import { render } from "preact/compat";
import Router from 'preact-router';
import S from "./index.module.less"
import { UsersListPage } from "./pages/UsersListPage/UsersListPage";
import { UsersEditPage } from "./pages/UsersEditPage/UsersEditPage";
import { AdminMenu } from "./components/AdminMenu/AdminMenu";
import { AvatarIcon, CubeIcon } from '@radix-ui/react-icons'
import { AppsListPage } from "./pages/AppsListPage/AppsListPage";
import { AppsEditPage } from "./pages/AppsEditPage/AppsEditPage";
import { useState } from "preact/hooks";
import { LoginPage } from "./pages/LoginPage/LoginPage";
import { TTableUsers } from "../server/db/schema.db";

const basePath = process.env.TENBEO_AUTH_CLIENT_ADMIN_BASE
export const routeTo = ( path:string ) => `${basePath}${path}`

export const tenbeoApplicationSlug = "tenbeo-admin"

function App () {

	const [ loggedUser, setLoggedUser ] = useState<TTableUsers>( null )

	function renderLogged () {
		return <>
			<AdminMenu
				class={ S._menu }
				items={[
					// {
					// 	icon: <DashboardIcon />,
					// 	label: "Dashboard",
					// 	href: routeTo("/"),
					// },
					{
						icon: <CubeIcon />,
						label: "Applications",
						href: routeTo("/"),
					},
					{
						icon: <AvatarIcon />,
						label: "Users",
						href: routeTo("/users/"),
					}
				]}
				setLoggedUser={ setLoggedUser }
				loggedUser={ loggedUser }
			/>
			<div class={ S._content }>
				<div class={ S._page }>
					<Router>
						{/* DASHBOARD */}
						{/*<DashboardPage path={routeTo("/")} />*/}
						{/* APPLICATIONS */}
						<AppsListPage path={routeTo("/")} />
						<AppsListPage path={routeTo("/apps/")} />
						<AppsEditPage path={routeTo("/apps/create")} />
						<AppsEditPage path={routeTo("/apps/:appId")} />
						{/* USERS */}
						<UsersListPage path={routeTo("/users/")} />
						<UsersListPage path={routeTo("/users/filter/:filter")} />
						<UsersEditPage path={routeTo("/users/create")} />
						<UsersEditPage path={routeTo("/users/:userId")} />
					</Router>
				</div>
			</div>
		</>
	}

	return <div class={ S.App }>
		{
			loggedUser === null
			? <LoginPage onLoggedIn={ setLoggedUser } />
			: renderLogged()
		}
	</div>
}

render( <App />, document.body )