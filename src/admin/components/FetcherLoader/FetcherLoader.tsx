import { h } from "preact";
import S from "./FetcherLoader.module.less"
import { joinClasses } from "../../utils/preact.utils";
import { PropsWithChildren } from "preact/compat";

interface IFetcherLoaderProps extends PropsWithChildren {
	class?:string
}

export function FetcherLoader ( props:IFetcherLoaderProps ) {
	return <div class={joinClasses(S.FetcherLoader, props.class)} />
}