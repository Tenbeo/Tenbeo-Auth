import { h } from "preact"
import S from "./AppsEditPage.module.less"
import { routeTo } from "../../index";
import { useFetcher } from "../../utils/hooks.utils";
import { TTableApps } from "../../../server/db/schema.db";
import { useState } from "preact/hooks";
import { route } from "preact-router";
import { FetcherLoader } from "../../components/FetcherLoader/FetcherLoader";
import { FetcherError } from "../../components/FetcherError/FetcherError";
import SForms from "../../styles/forms.module.less";
import { joinClasses } from "../../utils/preact.utils";
import { ArrowLeftIcon, CheckIcon } from "@radix-ui/react-icons";
import SPages from "../../styles/pages.module.less";
import { appsFetchers } from "../../fetchers/apps.fetcher";


interface IAppsEditPageProps {
	path	:string
	appId	?:number
}

export function AppsEditPage ( props:IAppsEditPageProps ) {
	const { appId } = props
	const isCreate = !appId
	const previousRoute = routeTo(`/apps/`)

	const { isLoading, error, data } = useFetcher(
		appsFetchers.get, [ appId ],
		isCreate ? {} as TTableApps : null
	)

	const [ isBusy, setIsBusy ] = useState( false )

	async function onFormSubmit ( event:Event ) {
		event.preventDefault()
		if ( isBusy )
			return
		setIsBusy( true )
		const formData = new FormData( event.currentTarget as HTMLFormElement )
		const app:Partial<TTableApps> = {}
		formData.forEach( (value, key) => app[ key ] = value )
		// @ts-ignore
		app.allowedHosts = app.allowedHosts.split("\n")
		try {
			if ( isCreate )
				await appsFetchers.create( app as TTableApps )
			else
				await appsFetchers.update( appId, app as TTableApps )
			route( previousRoute )
		}
		catch ( error ) {
			console.error( error )
			alert(`Unable to save application.`)
		}
		setIsBusy( false )
	}

	let component
	if ( isLoading )
		component = <FetcherLoader />
	else if ( error )
		component = <FetcherError error={ error } />
	else
		component = <form
			className={ SForms.Form }
			onSubmit={ onFormSubmit }
		>
			<label className={ SForms.Form_input }>
				<span>Application name *</span>
				<span>As slug ( Ex: "application-name" )</span>
				<input
					name="slug"
					defaultValue={ data.slug }
					required
					// pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
				/>
			</label>
			<br />
			<label className={ SForms.Form_input }>
				<span>Allowed Hosts</span>
				<span>One by line, wildcards allowed. Empty to disable external access.</span>
				<textarea
					name="allowedHosts"
					defaultValue={ (data.allowedHosts as string[] ?? []).join("\n") }
					rows={ 3 }
				/>
			</label>
			<br />
			<div className={ SForms.Form_actions }>
				<button
					type="submit"
					className={ joinClasses(SForms.Button, SForms.Button__positive) }
				>
					<CheckIcon />
					<span>Save</span>
				</button>
			</div>
		</form>

	return <div class={ S.UserEditPage }>
		<div class={ SPages._header }>
			<a
				href={ previousRoute }
				class={ SForms.Button }
			>
				<ArrowLeftIcon />
				<span>Back</span>
			</a>
			<h2>{ isCreate ? "Create new" : "Edit" } application { !isCreate && data?.slug }</h2>
		</div>
		{ component }
	</div>
}