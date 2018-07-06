import { Request, Response } from "express"
import { sendJSONresponse } from "../common/Utils"
import * as winston from "winston";
import Axios from "axios";
import { validationResult } from "express-validator/check"
import { ITokenInfo } from "./Interfaces/ITokenInfo";
import { constants } from "http2";

export class TokenInfo {
    private tokensInfo: {[key: string]: {[key: string]: ITokenInfo[]}} = {}
    private supportedNetworks: {[key: number]: string} = {
        1: "eth",
        3: "rop",
        4: "rin",
        43: "kov",
    }

    public getTokenInfo = async (req: Request, res: Response) => {
        try {
            const validationErrors = this.validateQueryParameters(req)
            console.log("params", req.params)
            if (validationErrors) {
                return sendJSONresponse(res, 400, validationErrors)
            }
            const address: string = req.params.address
            const network: string = req.params.networkid
            const networkIdName: string = this.supportedNetworks[network]

            if (!this.tokensInfo.hasOwnProperty(networkIdName)) {
                await this.getTokens(network)
            }

            sendJSONresponse(res, 200, {
                status: true,
                response: this.tokensInfo[networkIdName][address]
            })
        } catch (error) {
            sendJSONresponse(res, 500, {
                status: true,
                error
            })
        }
    }

    public getTokens = (network: string) => {
        try {
            const networkIdName: string = this.supportedNetworks[network]

            return new Promise(async (resolve) => {
                const tokens = await Axios.get(`https://raw.githubusercontent.com/MyEtherWallet/ethereum-lists/master/tokens/tokens-${networkIdName}.json`)

                const networkTokens = tokens.data.reduce((acc, val) => {
                    const tokenObj: {[key: string]: ITokenInfo} = {}
                    tokenObj[val.address.toLowerCase()] = val
                    Object.assign(acc, tokenObj)
                    return acc
                }, {})

                Object.assign(this.tokensInfo, {[networkIdName]: networkTokens})
                winston.info(`Tokens info loaded`)
                resolve()
            })
        } catch (error) {
            winston.error(`Error fetching tokens`, error)
            Promise.reject(error)
        }
    }

    private validateQueryParameters(req: Request) {
        req.checkParams("address", "Must be 42 characters long").isLength({max: 42, min: 42}).isAlphanumeric().optional()
        // req.checkQuery("network", `Suppoted networks ${this.supportedNetworks}`).isIn(this.supportedNetworks)

        return req.validationErrors();
    }
}