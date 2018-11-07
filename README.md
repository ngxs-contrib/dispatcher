<p align="center">
    <img src="https://raw.githubusercontent.com/ngxs-labs/emitter/master/docs/assets/logo.png">
</p>

---

> ER is a new pattern that provides the opportunity to feel free from actions

[![Build Status](https://travis-ci.org/ngxs-labs/emitter.svg?branch=master)](https://travis-ci.org/ngxs-labs/emitter)
[![Build status](https://ci.appveyor.com/api/projects/status/o6g3tjxmprr2qef9/branch/master?svg=true)](https://ci.appveyor.com/project/arturovt/emitter/branch/master)
[![NPM](https://badge.fury.io/js/%40ngxs-labs%2Femitter.svg)](https://www.npmjs.com/package/@ngxs-labs/emitter)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/ngxs-labs/tools/blob/master/license)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/079272acc4104332b904dc6818929d06)](https://www.codacy.com/app/arturovt/emitter?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ngxs-contrib/emitter&amp;utm_campaign=Badge_Grade)

[🚀 See it in action on Stackblitz](https://stackblitz.com/edit/ngxs-emitter-simple)

This package allows you to get rid of actions. You can use decorators to register actions directly in your state, you don't have to create any actions in your project (until you really need them), as they don't give any profit, only bring extra boilerplate files.

## Concepts
Compare these diagrams, we've simplified Redux flow and threw out unnecessary middleware:

![ER Flow](https://raw.githubusercontent.com/ngxs-labs/emitter/master/docs/assets/redux-er.png)

## 📦 Install

To install `@ngxs-labs/emitter` run the following command:

```console
npm install @ngxs-labs/emitter
# or if you use yarn
yarn add @ngxs-labs/emitter
```

To install `nanoid` dependency (required)
```console
npm install nanoid
# or if you use yarn
yarn add nanoid
```

## 🔨 Usage

Import the module into your root application module:

```typescript
import { NgModule } from '@angular/core';
import { NgxsModule } from '@ngxs/store';
import { NgxsEmitPluginModule } from '@ngxs-labs/emitter';

@NgModule({
    imports: [
        NgxsModule.forRoot(states),
        NgxsEmitPluginModule.forRoot()
    ]
})
export class AppModule {}
```

## Receiver

Receiver is a basic building block. `@Receiver()` is a function that allows you to decorate static methods in your states for further passing this method to the emitter:

```typescript
import { State, StateContext } from '@ngxs/store';
import { Receiver } from '@ngxs-labs/emitter';

@State<number>({
    name: 'counter',
    defaults: 0
})
export class CounterState {
    @Receiver()
    public static increment({ setState, getState }: StateContext<number>) {
        setState(getState() + 1);
    }

    @Receiver()
    public static decrement({ setState, getState }: StateContext<number>) {
        setState(getState() - 1);
    }
}
```

## Emitter

Emitter is basically a bridge between your component and receivers. `@Emitter()` is a function that decorates properties defining new getter and gives you an access to the emittable interface:

```typescript
import { Component } from '@angular/core';
import { Select } from '@ngxs/store';
import { Emitter, Emittable } from '@ngxs-labs/emitter';

import { Observable } from 'rxjs';

import { CounterState } from './counter.state';

@Component({
    selector: 'app-counter',
    template: `
        <ng-container *ngIf="counter$ | async as counter">
            <h3>Counter is {{ counter }}</h3>
        </ng-container>

        <button (click)="increment.emit()">Increment</button>
        <button (click)="decrement.emit()">Decrement</button>
    `
})
export class CounterComponent {
    @Select(CounterState)
    public counter$: Observable<number>;

    // Use in components to emit asynchronously payload
    @Emitter(CounterState.increment)
    public increment: Emittable<void>;

    @Emitter(CounterState.decrement)
    public decrement: Emittable<void>;
}
```

## Custom types

You can define custom types for debbuing purposes (works with `@ngxs/logger-plugin`):

```typescript
import { State, StateContext } from '@ngxs/store';
import { Receiver } from '@ngxs-labs/emitter';

@State<number>({
    name: 'counter',
    defaults: 0
})
export class CounterState {
    @Receiver({ type: '[Counter] Increment value' })
    public static increment({ setState, getState }: StateContext<number>) {
        setState(getState() + 1);
    }

    @Receiver({ type: '[Counter] Decrement value' })
    public static decrement({ setState, getState }: StateContext<number>) {
        setState(getState() - 1);
    }
}
```

## Actions

If you still need actions - it is possible to pass an action as an argument into `@Receiver()` decorator:

```typescript
import { State, StateContext } from '@ngxs/store';
import { Receiver } from '@ngxs-labs/emitter';

export class Increment {
    public static readonly type = '[Counter] Increment value';
}

export class Decrement {
    public static readonly type = '[Counter] Decrement value';
}

@State<number>({
    name: 'counter',
    defaults: 0
})
export class CounterState {
    @Receiver({ action: Increment })
    public static increment({ setState, getState }: StateContext<number>) {
        setState(getState() + 1);
    }

    @Receiver({ action: Decrement })
    public static decrement({ setState, getState }: StateContext<number>) {
        setState(getState() - 1);
    }
}
```

## Emitting multiple value

It's also possible to emit multiple values, just define your state:

```typescript
import { State, StateContext } from '@ngxs/store';
import { Receiver } from '@ngxs-labs/emitter';

@State<string[]>({
    name: 'animals',
    defaults: []
})
export class AnimalsState {
    @Receiver()
    public static addAnimal({ setState, getState }: StateContext<string[]>, { payload }: EmitterAction<string>) {
        setState([
            ...getState(),
            payload
        ]);
    }
}
```

And use `emitMany` method from `Emittable` object:

```typescript
import { Component } from '@angular/core';
import { Select } from '@ngxs/store';
import { Emitter, Emittable } from '@ngxs-labs/emitter';

import { Observable } from 'rxjs';

import { AnimalsState } from './animals.state';

@Component({
    selector: 'app-root',
    template: `
        <p *ngFor="let animal of (animals$ | async)">{{ animal }}</p>
        <button (click)="addAnimals()">Add animals</button>
    `
})
export class AppComponent {
    @Select(AnimalsState)
    public animals$: Observable<string[]>;

    @Emitter(AnimalsState.addAnimal)
    private addAnimal: Emittable<string>;

    public addAnimals(): void {
        this.addAnimal.emitMany(['panda', 'zebra', 'monkey']);
    }
}
```

## Dependency injection

Assume you have to make some API request and load some data from your server, it is very easy to use services with static methods, Angular provides an `Injector` class for getting instances by reference:

```typescript
import { Injector } from '@angular/core';

import { State, StateContext } from '@ngxs/store';
import { Receiver } from '@ngxs-labs/emitter';

import { tap } from 'rxjs/operators';

interface Todo {
    id: number;
    title: string;
    completed: boolean;
}

@State<Todo[]>({
    name: 'todos',
    defaults: []
})
export class TodosState {
    // ApiService is defined somewhere...
    private static api: ApiService;

    constructor(injector: Injector) {
        TodosState.api = injector.get<ApiService>(ApiService);
    }

    @Receiver()
    public static getTodos({ setState }: StateContext<Todo[]>) {
        // If `ApiService.prototype.getTodos` returns an `Observable` - just use `tap` operator
        return this.api.getTodos().pipe(
            tap((todos) => setState(todos))
        );
    }

    // OR

    @Receiver()
    public static getTodos({ setState }: StateContext<Todo[]>) {
        // If `ApiService.prototype.getTodos` returns a `Promise` - just use `then`
        return this.api.getTodos().then((todos) => setState(todos));
    }
}
```

If you work with promises - we advice you to use `async/await` approach, because method marked with `async` keyword will automatically return a `Promise`, you will not get confused if you missed `return` keyword somewhere:

```typescript
import { Injector } from '@angular/core';

import { State, StateContext } from '@ngxs/store';
import { Receiver } from '@ngxs-labs/emitter';

export type AppInformationStateModel = null | {
    version: string;
    shouldUseGraphQL: boolean;
};

@State<AppInformationStateModel>({
    name: 'information',
    defaults: null
})
export class AppInformationState {
    private static appService: AppService;

    constructor(injector: Injector) {
        AppInformationState.appService = injector.get<AppService>(AppService);
    }

    @Receiver({ type: '[App information] Get app information' })
    public static async getAppInformation({ setState }: StateContext<AppInformationStateModel>) {
        setState(
            await this.appService.getAppInformation()
        );
    }
}
```

## Lifecycle

As you may know - actions in NGXS have own lifecycle. We also provide RxJS operators that give you the ability to react to actions at different points in their existence:

- `ofEmittableDispatched`: triggers when an emittable target has been dispatched
- `ofEmittableSuccessful`: triggers when an emittable target has been completed successfully
- `ofEmittableCanceled`: triggers when an emittable target has been canceled
- `ofEmittableErrored`: triggers when an emittable target has caused an error to be thrown

Below is just a simple example how to use those operators:

```typescript
import { State, StateContext } from '@ngxs/store';
import { Receiver } from '@ngxs-labs/emitter';

import { throwError } from 'rxjs';

@State<number>({
    name: 'counter',
    defaults: 0
})
export class CounterState {
    @Receiver()
    public static increment({ setState, getState }: StateContext<number>) {
        setState(getState() + 1);
    }

    @Receiver()
    public static decrement({ setState, getState }: StateContext<number>) {
        setState(getState() - 1);
    }

    @Receiver()
    public static multiplyBy2({ setState, getState }: StateContext<number>) {
        setState(getState() * 2);
    }

    @Receiver()
    public static throwError() {
        return throwError(new Error('Whoops!'));
    }
}
```

Import operators in your component and pipe `Actions` service:

```typescript
import { Component } from '@angular/core';
import { Actions } from '@ngxs/store';
import {
    Emitter,
    Emittable,
    ofEmittableDispatched,
    ofEmittableActionContext
} from '@ngxs-labs/emitter';

import { CounterState } from './counter.state';

@Component({
    selector: 'app-root',
    template: ``
})
export class AppComponent {
    @Emitter(CounterState.increment)
    private increment: Emittable<void>;

    @Emitter(CounterState.decrement)
    private decrement: Emittable<void>;

    @Emitter(CounterState.throwError)
    private throwError: Emittable<void>;

    constructor(actions$: Actions) {
        actions$.pipe(
            ofEmittableDispatched(CounterState.increment)
        ).subscribe(() => {
            console.log('CounterState.increment has been intercepted');
        });

        setInterval(() => {
            this.increment.emit();
            this.decrement.emit();
            this.throwError.emit();
        }, 1000);
    }
}
```

## Testing

It's very easy to write unit tests using ER concept:

```typescript
it('should increment state', () => {
    @State<number>({
        name: 'counter',
        defaults: 0
    })
    class CounterState {
        @Receiver()
        public static increment({ setState, getState }: StateContext<number>) {
            setState(getState() + 1);
        }
    }

    @Component({ template: '' })
    class MockComponent {
        @Emitter(CounterState.increment)
        public incremnet: Emittable<void>;
    }

    TestBed.configureTestingModule({
        imports: [
            NgxsModule.forRoot([CounterState]),
            NgxsEmitPluginModule.forRoot()
        ],
        declarations: [
            MockComponent
        ]
    });

    const fixture = TestBed.createComponent(MockComponent);
    const store: Store = TestBed.get(Store);

    fixture.componentInstance.increment.emit();

    const counter = store.selectSnapshot<number>((state) => state.counter);
    expect(counter).toBe(1);
});
```
