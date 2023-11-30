import { h } from "preact";
import S from "./AdminMenu.module.less"
import SForms from "../../styles/forms.module.less"
import { joinClasses } from "../../utils/preact.utils";
import logo from "../../assets/tenbeo-logo.png"
import { useRouter } from "preact-router";
import { TTableUsers } from "../../../server/db/schema.db";
import { Avatar } from "../Avatar/Avatar";
import { authFetchers } from "../../fetchers/auth.fetchers";
import { ExitIcon } from "@radix-ui/react-icons";
import { tenbeoApplicationSlug } from "../../index";

interface IAdminMenuItem {
	icon		?:any
	label		:string
	href		:string
}

interface IAdminMenuProps {
	class			?:string
	items			:IAdminMenuItem[]
	setLoggedUser	?:(user:TTableUsers) => any
	loggedUser		?:TTableUsers
}

export function AdminMenu ( props:IAdminMenuProps ) {
	const { items, loggedUser, setLoggedUser } = props

	const [route] = useRouter()

	const selectedItem = [...items].reverse().find( item => {
		return route.url.startsWith( item.href )
	})

	async function logOut () {
		await authFetchers.logout( tenbeoApplicationSlug )
		setLoggedUser( null )
	}

	return <div class={ joinClasses(S.AdminMenu, props.class) }>
		<img class={ S._logo } src={ logo } />
		<div class={ S._items }>
			{ items.map( (item, i) =>
				<a
					key={ i }
					href={ item.href }
					title={ item.label }
					class={joinClasses(
						S._item,
						selectedItem === item && S._item__selected
					)}
				>
					{ item.icon }
					<span>{ item.label }</span>
				</a>
			)}
		</div>
		<div class={ S._user }>
			<Avatar email={ loggedUser?.email } />
			<button
				onClick={ logOut }
				class={joinClasses(SForms.Button, SForms.Button__negative, S._userLogOut)}
			>
				<ExitIcon />
				<span>Log out</span>
			</button>
		</div>
	</div>
}