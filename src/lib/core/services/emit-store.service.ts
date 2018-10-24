import { Injectable, Type } from '@angular/core';
import { Store } from '@ngxs/store';

import { Observable } from 'rxjs';

import { RECEIVER_META_KEY, Emittable, ReceiverMetaData } from '../internal/internals';
import { EmitterAction } from '../actions/actions';

@Injectable()
export class EmitStore extends Store {
    /**
     * @param receiver - Reference to the static function from the store
     * @returns - A plain object with an `emit` function for calling emitter
     */
    public emitter<T = any, U = any>(receiver: Function): Emittable<T, U> {
        const metadata: ReceiverMetaData = receiver[RECEIVER_META_KEY];

        if (!metadata) {
            throw new Error(`I can't seem to find static metadata. Have you decorated ${receiver.name} with @Receiver()?`);
        }

        return {
            emit: (payload?: T): Observable<U> => {
                EmitterAction.type = metadata.type;

                const shouldApplyDefaultPayload = typeof payload === 'undefined' && metadata.payload !== undefined;
                if (shouldApplyDefaultPayload) {
                    payload = metadata.payload;
                }

                const Action: Type<any> = metadata.action ? metadata.action : EmitterAction;
                return this.dispatch(new Action(payload));
            }
        };
    }
}
