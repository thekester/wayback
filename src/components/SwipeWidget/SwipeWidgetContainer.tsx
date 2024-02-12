/* Copyright 2024 Esri
 *
 * Licensed under the Apache License Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useCallback, useEffect } from 'react';

import { useSelector, useDispatch, batch } from 'react-redux';

import {
    isSwipeWidgetOpenSelector,
    swipeWidgetLeadingLayerSelector,
    swipeWidgetTrailingLayerSelector,
    swipePositionUpdated,
} from '@store/Swipe/reducer';

import { metadataQueryResultUpdated } from '@store/Map/reducer';

import SwipeWidget from './SwipeWidget';

import { MobileHide } from '../MobileVisibility';

// import IMapView from 'esri/views/MapView';
import MapView from '@arcgis/core/views/MapView';
import { IWaybackItem } from '@typings/index';
import { saveSwipeWidgetInfoInURLQueryParam } from '@utils/UrlSearchParam';

type Props = {
    mapView?: MapView;
};

const SwipeWidgetContainer: React.FC<Props> = ({ mapView }: Props) => {
    const dispatch = useDispatch();

    const isOpen = useSelector(isSwipeWidgetOpenSelector);

    const waybackItem4LeadingLayer: IWaybackItem = useSelector(
        swipeWidgetLeadingLayerSelector
    );
    const waybackItem4TrailingLayer: IWaybackItem = useSelector(
        swipeWidgetTrailingLayerSelector
    );

    const positionOnChangeHandler = useCallback((position: number) => {
        batch(() => {
            dispatch(swipePositionUpdated(position));
            dispatch(metadataQueryResultUpdated(null));
        });
    }, []);

    useEffect(() => {
        saveSwipeWidgetInfoInURLQueryParam({
            isOpen,
            rNum4SwipeWidgetLeadingLayer: waybackItem4LeadingLayer.releaseNum,
            rNum4SwipeWidgetTrailingLayer: waybackItem4TrailingLayer.releaseNum,
        });
    }, [isOpen, waybackItem4LeadingLayer, waybackItem4TrailingLayer]);

    return (
        <MobileHide>
            <SwipeWidget
                mapView={mapView}
                waybackItem4LeadingLayer={waybackItem4LeadingLayer}
                waybackItem4TrailingLayer={waybackItem4TrailingLayer}
                isOpen={isOpen}
                positionOnChange={positionOnChangeHandler}
            />
        </MobileHide>
    );
};

export default SwipeWidgetContainer;
