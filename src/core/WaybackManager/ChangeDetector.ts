import { queryFeatures, IQueryFeaturesResponse, IFeature  } from '@esri/arcgis-rest-feature-layer';

import { geometryFns } from 'helper-toolkit-ts';

import { IWaybackConfig, IMapPointInfo } from '../../types/index';
// import { } from './types';
import config from './config';

interface ICandidates {
    rNum:number
    url:string
}

interface IParamGetTileUrl{
    rNum:number
    column:number,
    row:number,
    level:number,
}

interface IOptionsWaybackChangeDetector {
    url:string,
    waybackconfig:IWaybackConfig
}

interface IResponseGetImageBlob {
    rNum:number,
    dataUri:string
}

class WaybackChangeDetector {

    // original wayback config JSON file
    private waybackconfig:IWaybackConfig;

    private url:string

    constructor({
        url = '',
        waybackconfig = null
    }:IOptionsWaybackChangeDetector){
        this.url = url;
        this.waybackconfig = waybackconfig;
    }

    // get array of release numbers for wayback items that come with changes for input area
    async findChanges(pointInfo:IMapPointInfo):Promise<Array<number>>{

        try {

            const queryUrl = this.url + '/query';

            const fields = config["change-detection-layer"].fields

            const FIELD_NAME_ZOOM = fields[0].fieldname;
            const FIELD_NAME_RELEASE_NUM = fields[1].fieldname;
            const FIELD_NAME_RELEASE_NAME = fields[2].fieldname;

            const level = pointInfo.zoom;
            const column = geometryFns.long2tile(pointInfo.longitude, level);
            const row = geometryFns.lat2tile(pointInfo.latitude, level);
            
            const queryResponse = await queryFeatures({
                url: queryUrl,
                geometry: pointInfo.geometry,
                geometryType: 'esriGeometryPoint',
                spatialRel: 'esriSpatialRelIntersects',
                where: `${FIELD_NAME_ZOOM} = ${level}`,
                outFields: [FIELD_NAME_RELEASE_NUM],
                orderByFields: FIELD_NAME_RELEASE_NAME,
                returnGeometry: false,
                f: 'json'
            }) as IQueryFeaturesResponse;
    
            const features:Array<IFeature> = queryResponse.features || [];

            const candidates = features.map(feature=>{
                const rNum = feature.attributes[FIELD_NAME_RELEASE_NUM];
                return {
                    rNum,
                    url: this.getTileImageUrl({column, row, level, rNum})
                }
            });

            const rNumsNoDuplicates = await this.removeDuplicates(candidates);

            return rNumsNoDuplicates;

        } catch(err){
            console.error('failed to find changes', err);
            return null;
        }
    }

    getTileImageUrl({
        column=null,
        row=null,
        level=null,
        rNum=null
    }:IParamGetTileUrl){
        const urlTemplate = this.waybackconfig[rNum].itemURL;
        return urlTemplate.replace("{level}", level.toString()).replace("{row}", row.toString()).replace("{col}", column.toString());
    }

    async removeDuplicates(candidates?:Array<ICandidates>):Promise<Array<number>>{

        if(!candidates.length){
            return [];
        }

        const finalResults:Array<number> = [];

        const imageDataUriRequests = candidates.map(candidate=>{
            return this.getImagedDataUri(candidate.url, candidate.rNum);
        });

        try {
            const imageDataUriResults = await Promise.all(imageDataUriRequests);
            // console.log(imageBlobResults);

            imageDataUriResults.reduce((accu, curr)=>{
                if(!accu.includes(curr.dataUri)){
                    accu.push(curr.dataUri);
                    finalResults.push(curr.rNum);
                }
                return accu;
            }, []);

        } catch(err){
            console.error('failed to fetch all image data uri', err);
        }

        return finalResults;
    }

    async getImagedDataUri(imageUrl:string, rNum:number):Promise<IResponseGetImageBlob>{
        return new Promise((resolve, reject) => {
    
            const xhr = new XMLHttpRequest();
            xhr.open('GET', imageUrl, true);
            xhr.responseType = 'arraybuffer';

            xhr.onload = function(e) {
                if (this.status == 200) {
                    const uInt8Array = new Uint8Array(this.response);
                    let i = uInt8Array.length;
                    const binaryString = new Array(i);
                    while (i--){
                        binaryString[i] = String.fromCharCode(uInt8Array[i]);
                    }
                    const data = binaryString.join('');
                    const base64 = window.btoa(data);
                    const dataUri = base64.substr(512,5000); 
                    // console.log(tileImageDataUri);

                    resolve({
                        rNum,
                        dataUri
                    });
                } else {
                    reject(null)
                }
            };

            xhr.send();
        });
    }
}

export default WaybackChangeDetector;