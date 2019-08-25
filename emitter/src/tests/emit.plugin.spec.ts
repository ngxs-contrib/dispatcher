import { TestBed } from '@angular/core/testing';
import { Component, Injectable, Injector } from '@angular/core';
import { State, Store, NgxsModule, StateContext } from '@ngxs/store';

import { Observable, of } from 'rxjs';
import { delay, take, tap } from 'rxjs/operators';

import { Receiver } from '../lib/core/decorators/receiver';
import { RECEIVER_META_KEY, Emittable } from '../lib/core/internal/internals';
import { EmitterAction } from '../lib/core/actions/actions';
import { Emitter } from '../lib/core/decorators/emitter';
import { NgxsEmitPluginModule } from '../lib/emit.module';
import { EmitStore } from '../lib/core/services/emit-store.service';

describe(NgxsEmitPluginModule.name, () => {
  interface Todo {
    text: string;
    completed: boolean;
  }

  it('should throw an error if a decorated method is not static', () => {
    try {
      @State({ name: 'bar' })
      class BarState {
        @Receiver()
        public foo() {}
      }
    } catch ({ message }) {
      expect(message).toBe('Only static functions can be decorated with @Receiver() decorator');
    }
  });

  it('static metadata should have `type` property same as in @Receiver() decorator', () => {
    @State({ name: 'bar' })
    class BarState {
      @Receiver({ type: '@@[bar]' })
      public static foo() {}
    }

    const BarFooMeta = BarState.foo[RECEIVER_META_KEY];
    expect(BarFooMeta.type).toBe('@@[bar]');
  });

  it('static metadata should have default `type` property', () => {
    @State({ name: 'bar' })
    class BarState {
      @Receiver()
      public static foo() {}
    }

    const BarFooMeta = BarState.foo[RECEIVER_META_KEY];
    const typeContainsClassName = BarFooMeta.type.indexOf('BarState.foo') > -1;
    expect(typeContainsClassName).toBeTruthy();
  });

  it('should decorate property with @Emitter() decorator', () => {
    @State<Todo[]>({
      name: 'todos',
      defaults: []
    })
    class TodosState {
      @Receiver()
      public static addTodo() {}
    }

    @Component({ template: '' })
    class MockComponent {
      @Emitter(TodosState.addTodo)
      public addTodoAction!: Emittable<Todo>;
    }

    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([TodosState]), NgxsEmitPluginModule.forRoot()],
      declarations: [MockComponent]
    });

    const fixture = TestBed.createComponent(MockComponent);
    expect(typeof fixture.componentInstance.addTodoAction).toBe('object');
    expect(typeof fixture.componentInstance.addTodoAction.emit).toBe('function');
  });

  it('should throw if decorated properties with @Emitter() and @Receiver() have the same names', () => {
    try {
      @State({ name: 'bar' })
      class BarState {
        @Emitter(BarState.foo)
        private foo!: Emittable;

        @Receiver({ type: '@@[bar]' })
        public static foo() {}
      }
    } catch ({ message }) {
      expect(message).toBe('Property with name `foo` already exists, please rename to avoid conflicts');
    }
  });

  it('should dispatch an action using property decorated with @Emitter()', () => {
    @State<Todo[]>({
      name: 'todos',
      defaults: []
    })
    class TodosState {
      @Receiver({ type: '@@[Todos] Add todo' })
      public static addTodo({ setState, getState }: StateContext<Todo[]>, action: EmitterAction<Todo>) {
        setState([...getState(), action.payload]);
      }
    }

    @Component({ template: '' })
    class MockComponent {
      @Emitter(TodosState.addTodo)
      public addTodoAction!: Emittable<Todo>;
    }

    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([TodosState]), NgxsEmitPluginModule.forRoot()],
      declarations: [MockComponent]
    });

    const store: Store = TestBed.get(Store);
    const fixture = TestBed.createComponent(MockComponent);

    fixture.componentInstance.addTodoAction.emit({
      text: 'buy some coffee',
      completed: false
    });

    const todos = store.selectSnapshot<Todo[]>(({ todos }) => todos);
    expect(todos.length).toBe(1);
  });

  it('should add todo using @Receiver() decorator', () => {
    @State<Todo[]>({
      name: 'todos',
      defaults: []
    })
    class TodosState {
      @Receiver()
      public static addTodo({ setState, getState }: StateContext<Todo[]>, action: EmitterAction<Todo>) {
        setState([...getState(), action.payload]);
      }
    }

    @Component({ template: '' })
    class MockComponent {
      @Emitter(TodosState.addTodo)
      public addTodo!: Emittable<Todo>;
    }

    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([TodosState]), NgxsEmitPluginModule.forRoot()],
      declarations: [MockComponent]
    });

    const store: Store = TestBed.get(Store);
    const fixture = TestBed.createComponent(MockComponent);

    fixture.componentInstance.addTodo.emit({
      text: 'buy coffee',
      completed: false
    });

    const todos = store.selectSnapshot<Todo[]>(({ todos }) => todos);
    expect(todos.length).toBe(1);
  });

  it('should cancel uncompleted action', (done: jest.DoneCallback) => {
    @State<number>({
      name: 'counter',
      defaults: 0
    })
    class CounterState {
      @Receiver({ cancelUncompleted: true })
      public static increment({ setState, getState }: StateContext<number>): Observable<null> {
        return of(null).pipe(
          delay(1000),
          tap(() => {
            setState(getState() + 1);
          })
        );
      }
    }

    @Component({ template: '' })
    class MockComponent {
      @Emitter(CounterState.increment)
      public increment!: Emittable;
    }

    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([CounterState]), NgxsEmitPluginModule.forRoot()],
      declarations: [MockComponent]
    });

    const store: Store = TestBed.get(Store);
    const fixture = TestBed.createComponent(MockComponent);

    Promise.all([
      fixture.componentInstance.increment.emit().toPromise(),
      fixture.componentInstance.increment.emit().toPromise()
    ]).then(() => {
      const counter = store.selectSnapshot<number>(({ counter }) => counter);
      expect(counter).toBe(1);

      done();
    });
  });

  it('should dispatch an action from the sub state', () => {
    @State({
      name: 'bar2',
      defaults: 10
    })
    class Bar2State {
      @Receiver()
      public static foo2({ setState }: StateContext<number>) {
        setState(20);
      }
    }

    @State({
      name: 'bar',
      defaults: {},
      children: [Bar2State]
    })
    class BarState {}

    @Component({ template: '' })
    class MockComponent {
      @Emitter(Bar2State.foo2)
      public foo2!: Emittable;
    }

    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([BarState, Bar2State]), NgxsEmitPluginModule.forRoot()],
      declarations: [MockComponent]
    });

    const store: Store = TestBed.get(Store);
    const fixture = TestBed.createComponent(MockComponent);

    fixture.componentInstance.foo2.emit();

    const bar2Value = store.selectSnapshot((state) => state.bar).bar2;
    expect(bar2Value).toBe(20);
  });

  it('should throw an error that such `type` already exists', () => {
    try {
      @State({
        name: 'bar',
        defaults: 10
      })
      class BarState {
        @Receiver({ type: 'foo' })
        public static foo1() {}

        @Receiver({ type: 'foo' })
        public static foo2() {}
      }

      TestBed.configureTestingModule({
        imports: [NgxsModule.forRoot([BarState]), NgxsEmitPluginModule.forRoot()]
      });
    } catch ({ message }) {
      expect(message).toBe('Method decorated with such type `foo` already exists');
    }
  });

  it('should throw an error if an action passed to the @Receiver() does not have static `type` property', () => {
    class FooAction {
      public static readonly type = 'FooAction';
    }

    try {
      @State({ name: 'bar' })
      class BarState {
        @Receiver({ action: FooAction })
        public static foo() {}
      }
    } catch ({ message }) {
      expect(message).toBe('FooAction`s type should be defined as a static property `type`');
    }
  });

  it('should be able to use @Receiver() with symbol-key methods', () => {
    const symbol = Symbol.for('foo');

    @State({ name: 'bar' })
    class BarState {
      @Receiver()
      public static [symbol]() {}
    }

    const typeContainsClassName = BarState[symbol][RECEIVER_META_KEY].type.indexOf('BarState.Symbol(foo)') > -1;
    expect(typeContainsClassName).toBeTruthy();
  });

  it('EmitStore.prototype.emitter should return an emittable object', () => {
    @State({ name: 'bar' })
    class BarState {
      @Receiver()
      public static foo() {}
    }

    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([BarState]), NgxsEmitPluginModule.forRoot()]
    });

    const store: EmitStore = TestBed.get(EmitStore);

    expect(typeof store.emitter(BarState.foo)).toBe('object');
    expect(typeof store.emitter(BarState.foo).emit).toBe('function');
  });

  it('should dispatch an action using @Receiver() after delay', () => {
    @Injectable()
    class ApiService {
      private size = 10;

      public getTodosFromServer(length: number): Observable<Todo[]> {
        return of(this.generateTodoMock(length)).pipe(delay(1000));
      }

      private generateTodoMock(size?: number): Todo[] {
        const length = size || this.size;
        return Array.from({ length }).map(() => ({
          text: 'buy some coffee',
          completed: false
        }));
      }
    }

    @State<Todo[]>({
      name: 'todos',
      defaults: []
    })
    class TodosState {
      public static api: ApiService = null!;

      constructor(injector: Injector) {
        TodosState.api = injector.get<ApiService>(ApiService);
      }

      @Receiver({ type: '@@[Todos] Set todos sync' })
      public static async setTodosSync({ setState }: StateContext<Todo[]>) {
        setState(await TodosState.api.getTodosFromServer(10).toPromise());
      }

      @Receiver({ type: '@@[Todos] Set todos' })
      public static setTodos({ setState }: StateContext<Todo[]>) {
        return TodosState.api.getTodosFromServer(5).pipe(
          take(1),
          tap((todos) => setState(todos))
        );
      }
    }

    @Component({ template: '' })
    class MockComponent {
      @Emitter(TodosState.setTodosSync)
      public setTodosSync!: Emittable;

      @Emitter(TodosState.setTodos)
      public setTodos!: Emittable;
    }

    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([TodosState]), NgxsEmitPluginModule.forRoot()],
      declarations: [MockComponent],
      providers: [ApiService]
    });

    const store: Store = TestBed.get(Store);
    const fixture = TestBed.createComponent(MockComponent);

    fixture.componentInstance.setTodosSync.emit().subscribe(() => {
      const todos = store.selectSnapshot<Todo[]>(({ todos }) => todos);
      expect(todos.length).toBe(10);
    });

    fixture.componentInstance.setTodos.emit().subscribe(() => {
      const todos = store.selectSnapshot<Todo[]>(({ todos }) => todos);
      expect(todos.length).toBe(5);
    });
  });

  it('should throw an error if the function passed to @Emitter() is not decorated with @Receiver()', () => {
    @State({
      name: 'todos',
      defaults: []
    })
    class TodosState {
      public static addTodo() {}
    }

    @Component({ template: '' })
    class MockComponent {
      @Emitter(TodosState.addTodo)
      public addTodo!: Emittable;
    }

    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([TodosState]), NgxsEmitPluginModule.forRoot()],
      declarations: [MockComponent]
    });

    const fixture = TestBed.createComponent(MockComponent);

    try {
      fixture.componentInstance.addTodo.emit();
    } catch ({ message }) {
      expect(message.indexOf(`Static metadata cannot be found`) > -1).toBeTruthy();
    }
  });

  it('should be possible to pass an action into @Receiver() decorator', () => {
    class AddTodo {
      public static type = '@@[Todos] Add todo';
      constructor(public payload: Todo) {}
    }

    @State<Todo[]>({
      name: 'todos',
      defaults: []
    })
    class TodosState {
      @Receiver({ action: AddTodo })
      public static addTodo({ setState, getState }: StateContext<Todo[]>, { payload }: AddTodo) {
        setState([...getState(), payload]);
      }
    }

    @Component({ template: '' })
    class MockComponent {
      @Emitter(TodosState.addTodo)
      public addTodoAction!: Emittable<Todo>;
    }

    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([TodosState]), NgxsEmitPluginModule.forRoot()],
      declarations: [MockComponent]
    });

    const store: Store = TestBed.get(Store);
    const fixture = TestBed.createComponent(MockComponent);

    fixture.componentInstance.addTodoAction.emit({
      text: 'buy coffee',
      completed: false
    });

    const todos = store.selectSnapshot<Todo[]>(({ todos }) => todos);
    expect(todos.length).toBe(1);
  });

  it('should emit with a default payload', () => {
    type TodosStateModel = Todo[] | null;

    @State<TodosStateModel>({
      name: 'todos',
      defaults: null
    })
    class TodosState {
      @Receiver({ payload: [] })
      public static setInitialTodos({ setState }: StateContext<Todo[]>, { payload }: EmitterAction<Todo[]>) {
        setState(payload);
      }
    }

    @Component({ template: '' })
    class MockComponent {
      @Emitter(TodosState.setInitialTodos)
      public addTodoAction!: Emittable;
    }

    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([TodosState]), NgxsEmitPluginModule.forRoot()],
      declarations: [MockComponent]
    });

    const fixture = TestBed.createComponent(MockComponent);
    const store: Store = TestBed.get(Store);

    fixture.componentInstance.addTodoAction.emit();

    const todos = store.selectSnapshot<Todo[]>(({ todos }) => todos);
    expect(Array.isArray(todos)).toBeTruthy();
  });

  it('should add multiple animals using `emitMany`', () => {
    @State<string[]>({
      name: 'animals',
      defaults: []
    })
    class AnimalsState {
      @Receiver()
      public static addAnimal({ getState, setState }: StateContext<string[]>, { payload }: EmitterAction<string>) {
        setState([...getState(), payload]);
      }
    }

    @Component({ template: '' })
    class MockComponent {
      @Emitter(AnimalsState.addAnimal)
      public addAnimal!: Emittable<string>;
    }

    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([AnimalsState]), NgxsEmitPluginModule.forRoot()],
      declarations: [MockComponent]
    });

    const fixture = TestBed.createComponent(MockComponent);
    const store: Store = TestBed.get(Store);

    fixture.componentInstance.addAnimal.emitMany(['Zebra', 'Panda']);

    const animals = store.selectSnapshot<string[]>(({ animals }) => animals);

    expect(animals.length).toBe(2);
    expect(animals).toContain('Zebra');
    expect(animals).toContain('Panda');
  });

  it('should be possible to pass multiple actions into @Receiver() decorator', () => {
    class Increment {
      public static readonly type = '[Counter] Increment';
    }

    class Decrement {
      public static readonly type = '[Counter] Decrement';
    }

    @State({
      name: 'counter',
      defaults: 0
    })
    class CounterState {
      @Receiver({ action: [Increment, Decrement] })
      public static mutate({ setState, getState }: StateContext<number>, action: Increment | Decrement): void {
        const state = getState();

        if (action instanceof Increment) {
          setState(state + 1);
        } else if (action instanceof Decrement) {
          setState(state - 1);
        }
      }
    }

    @Component({ template: '' })
    class MockComponent {
      @Emitter(CounterState.mutate)
      public mutate!: Emittable;
    }

    TestBed.configureTestingModule({
      imports: [NgxsModule.forRoot([CounterState]), NgxsEmitPluginModule.forRoot()],
      declarations: [MockComponent]
    });

    const store: Store = TestBed.get(Store);

    store.dispatch(new Increment());
    store.dispatch(new Decrement());

    const counter = store.selectSnapshot<number>(({ counter }) => counter);
    expect(counter).toBe(0);
  });
});
