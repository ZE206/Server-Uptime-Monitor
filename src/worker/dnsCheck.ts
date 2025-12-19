import dns from "dns/promises";
import {CheckResult} from "../types";

export async function runDnsCheck(endpoint:any): Promise<CheckResult>{
    const hostname= new URL(endpoint.url).hostname;

    try{
        const result=await dns.lookup(hostname);
        const ip=result.ip;
        return {
            checkType:"DNS",
            status:"UP",
            resolvedIp: ip,
        }
    } catch (err: any){
        return{
            checkType:"DNS",
            status:"DOWN",
            error:err.message,
        }
    }
}