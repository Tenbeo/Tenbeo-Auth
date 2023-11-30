import { h } from "preact";
import S from "./UsersListPage.module.less"
import SForms from "../../styles/forms.module.less"
import SPages from "../../styles/pages.module.less"
import { routeTo } from "../../index";
import { userFetchers } from "../../fetchers/user.fetcher";
import { useFetcher } from "../../utils/hooks.utils";
import { FetcherLoader } from "../../components/FetcherLoader/FetcherLoader";
import { FetcherError } from "../../components/FetcherError/FetcherError";
import { Pencil2Icon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { joinClasses } from "../../utils/preact.utils";
import { useEffect, useState } from "preact/hooks";
import { IUserWithSubscribedApps, TTableApps } from "../../../server/db/schema.db";
import { route } from "preact-router";

type TAppFilter = "all"|"without"|string

interface IUsersListPageProps {
	path	:string
	filter	?:TAppFilter
}

export function UsersListPage ( props:IUsersListPageProps ) {

	const { isLoading, error, data, updateData } = useFetcher( userFetchers.list, [])

	async function deleteUser ( userId:number ) {
		const user = data.find( u => u.id === userId )
		if ( !user || !confirm(`Are you sure to delete user ${ user.name } ?`) )
			return
		try {
			await userFetchers.delete(userId)
			updateData( data.filter( u => u.id !== userId ))
		}
		catch ( error ) {
			console.error( error )
			alert(`Unable to delete user ${userId}`)
		}
	}

	const appFilter = props.filter ?? "all"
	const selectAppFilterChanged = (event:Event) => {
		const selectedFilter = (event.currentTarget as HTMLSelectElement).value
		let path = selectedFilter === "all" ? `/users/` : `/users/filter/${selectedFilter}`
		route( routeTo( path ), true )
	}

	// When data are loaded, extract all available apps through users.
	const [ apps, setApps ] = useState<TTableApps[]>([])
	useEffect(() => {
		if ( !data )return
		const appsById = {}
		data.map(
			user => user.appsSubscriptions.forEach(
				app => appsById[ app.id ] ??= app
			)
		)
		setApps( Object.values(appsById) )
	}, [data])

	function renderFilter () {
		return <div className={joinClasses(SPages._filters, SForms.Form)}>
			<label className={joinClasses(SForms.Form_input, SForms.Form_input__horizontal)}>
				<span>Application</span>
				<select onChange={ selectAppFilterChanged } defaultValue={ appFilter }>
					<option value="all">Show all users</option>
					<option value="without">Users without app</option>
					<option disabled>──────────</option>
					{apps.map( app => <option value={ app.id } key={ app.id }>{ app.slug }</option> )}
				</select>
			</label>
		</div>
	}

	function renderTableLine ( user:IUserWithSubscribedApps ) {
		return <tr key={ user.id }>
			<td>{ user.name }</td>
			<td className={ SForms.Table_tags }>
				<div>
					{ user.appsSubscriptions.map( app => <span>{ app.slug }</span> )}
				</div>
			</td>
			<td className={ SForms.Table_actions }>
				<div>
					<a
						href={ routeTo(`/users/${user.id}`) }
						className={ joinClasses(SForms.Button, SForms.Button__eminent) }
					>
						<Pencil2Icon />
						<span>Edit</span>
					</a>
					<button
						onClick={ e => deleteUser( user.id ) }
						className={ joinClasses(SForms.Button, SForms.Button__negative) }
					>
						<TrashIcon />
						<span>Delete</span>
					</button>
				</div>
			</td>
		</tr>
	}

	function renderTable () {
		let filteredUserList = [ ...data ]
		// Filter users that have no app subscriptions
		if ( appFilter === "without" ) {
			filteredUserList = filteredUserList.filter(
				user => user.appsSubscriptions.length === 0
			)
		}
		// Filter users that subscribes to a specific app id
		else if ( appFilter !== "all" ) {
			const appId = parseFloat( appFilter )
			filteredUserList = filteredUserList.filter(
				user => user.appsSubscriptions.find(
					app => app.id == appId
				)
			)
		}

		return <table className={ SForms.Table }>
			<thead>
				<tr>
					<th>Name</th>
					<th>Apps</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{ filteredUserList?.map( renderTableLine ) }
			</tbody>
		</table>
	}

	let component
	if ( isLoading )
		component = <FetcherLoader />
	else if ( error )
		component = <FetcherError error={ error } />
	else
		component = [ renderFilter(), renderTable() ]

	return <div class={ S.UsersListPage }>
		<div class={ SPages._header }>
			<h2>Authorized users</h2>
			<a
				href={ routeTo(`/users/create`) }
				class={ joinClasses(SForms.Button, SForms.Button__positive) }
			>
				<PlusIcon />
				<span>Add user</span>
			</a>
		</div>
		{ component }
	</div>
}