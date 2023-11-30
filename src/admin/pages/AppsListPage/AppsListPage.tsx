import { h } from "preact";
import S from "./AppsListPage.module.less"
import { useFetcher } from "../../utils/hooks.utils";
import { appsFetchers } from "../../fetchers/apps.fetcher";
import { FetcherLoader } from "../../components/FetcherLoader/FetcherLoader";
import { FetcherError } from "../../components/FetcherError/FetcherError";
import SPages from "../../styles/pages.module.less";
import { routeTo } from "../../index";
import { joinClasses } from "../../utils/preact.utils";
import SForms from "../../styles/forms.module.less";
import { Pencil2Icon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";


export function AppsListPage ( props ) {

	const { isLoading, error, data, updateData } = useFetcher( appsFetchers.list, [] )

	async function deleteApp ( appId:number ) {
		const app = data.find( u => u.id === appId )
		if ( !app || !confirm(`Are you sure to delete application ${ app.slug } ?`) )
			return
		try {
			await appsFetchers.delete(appId)
			updateData( data.filter( u => u.id !== appId ))
		}
		catch ( error ) {
			console.error( error )
			alert(`Unable to delete application ${appId}`)
		}
	}

	function renderTable () {
		return <table className={ SForms.Table }>
			<thead>
			<tr>
				<th>Name</th>
				<th>Domains</th>
				<th>Users</th>
				<th>Actions</th>
			</tr>
			</thead>
			<tbody>
			{ data?.map( app =>
				<tr key={ app.id }>
					<td>{ app.slug }</td>
					<td className={ SForms.Table_tags }>
						<div>
							{ (app.allowedHosts as string[] ?? []).map( host => <span>{ host || "no external access" }</span> )}
						</div>
					</td>
					<td>{`${app.totalUsers} user${app.totalUsers > 1 ? 's' : ''}`}</td>
					<td className={ SForms.Table_actions }>
						{
							app.locked ? "" : <div>
								<a
									href={ routeTo(`/apps/${app.id}`)}
									className={ joinClasses(SForms.Button, SForms.Button__eminent) }
								>
									<Pencil2Icon />
									<span>Edit</span>
								</a>
								<button
									onClick={ e => deleteApp( app.id ) }
									className={ joinClasses(SForms.Button, SForms.Button__negative) }
								>
									<TrashIcon />
									<span>Delete</span>
								</button>
							</div>
						}
					</td>
				</tr>
			)}
			</tbody>
		</table>
	}

	let component
	if ( isLoading )
		component = <FetcherLoader />
	else if ( error )
		component = <FetcherError error={ error } />
	else
		component = renderTable()

	return <div class={ S.AppsListPage }>
		<div class={ SPages._header }>
			<h2>Tenbeo Auth Applications</h2>
			<a
				href={ routeTo(`/apps/create`) }
				class={ joinClasses(SForms.Button, SForms.Button__positive) }
			>
				<PlusIcon />
				<span>Add application</span>
			</a>
		</div>
		{ component }
	</div>
}