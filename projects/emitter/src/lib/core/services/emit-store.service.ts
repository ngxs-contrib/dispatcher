import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';

import { Observable } from 'rxjs';

import { EMITTER_META_KEY, Emittable, EmitterMetaData, TransactionEmittable } from '../internal/internals';
import { EmitterAction } from '../actions/actions';

function mergeActions(emitters: Function[]): any[] {
    const actions: any[] = [];

    for (let i = 0, length = emitters.length; i < length; i++) {
        const emitter = emitters[i];
        const emitterEvent = emitter[EMITTER_META_KEY];

        if (!emitterEvent) {
            throw new Error('Emitter methods should be decorated using @Emitter() decorator');
        }

        EmitterAction.type = emitterEvent.type;

        actions.push(
            emitterEvent.action ? emitterEvent.action : EmitterAction
        );
    }

    return actions;
}

function getActionInstances<T>(actions: any[], ...payloads: T[]): any[] {
    const instances: any[] = [];

    for (let i = 0, length = actions.length; i < length; i++) {
        const payload = payloads[i];

        if (payload) {
            instances.push(new actions[i](payload));
        } else {
            instances.push(new actions[i]);
        }
    }

    return instances;
}

@Injectable()
export class EmitStore extends Store {
    /**
     * @param emitter - Reference to the static function from the store
     * @returns - A plain object with an `emit` function for calling emitter
     */
    public emitter<T = any, U = any>(emitter: Function): Emittable<T, U> {
        const emitterEvent: EmitterMetaData = emitter[EMITTER_META_KEY];

        if (!emitterEvent) {
            throw new Error('Emitter methods should be decorated using @Emitter() decorator');
        }

        return {
            emit: (payload?: T): Observable<U> => {
                EmitterAction.type = emitterEvent.type;
                const Action: any | typeof EmitterAction = emitterEvent.action ? emitterEvent.action : EmitterAction;
                return this.dispatch(new Action(payload));
            }
        };
    }

    /**
     * Used to dispatch multiple actions
     *
     * @param emitters - Array that contains references to the static functions from the store
     * @returns - A plain object with an `emit` function for calling emitter
     */
    public transactionEmitter<T = any, U = any>(emitters: Function[]): TransactionEmittable<T, U> {
        const actions = mergeActions(emitters);

        return {
            emit: (...payloads: T[]): Observable<U> => {
                if (!payloads.length) {
                    return this.dispatch(getActionInstances(actions));
                }

                return this.dispatch(getActionInstances(actions, payloads));
            }
        };
    }
}
