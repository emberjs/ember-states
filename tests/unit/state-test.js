import { module, test } from 'qunit';
import State from 'ember-states/state';
import StateManager from 'ember-states/state-manager';
import Ember from 'ember';

module("State");

test("exists", (assert) => {
  assert.ok(Ember.Object.detect(State), "State is an Ember.Object");
});

test("creating a state with substates sets the parentState property", (assert) => {
  var state = State.create({
    child: State.create()
  });

  assert.equal(state.get('child.parentState'), state, "A child state gets its parent state");
  assert.deepEqual(state.get('childStates'), [ state.get('child') ], "The childStates method returns a state's child states");
});

test("a state is passed its state manager when receiving an enter event", (assert) => {
  assert.expect(2);

  var count = 0;

  var states = {
    load: State.create({
      enter(passedStateManager) {
        if (count === 0) {
          assert.ok(passedStateManager.get('isFirst'), "passes first state manager when created");
        } else {
          assert.ok(passedStateManager.get('isSecond'), "passes second state manager when created");
        }

        count++;
      }
    })
  };

  StateManager.create({
    initialState: 'load',
    isFirst: true,

    states: states
  });

  StateManager.create({
    initialState: 'load',
    isSecond: true,

    states: states
  });
});

test("a state can have listeners that are fired when the state is entered", (assert) => {
  assert.expect(2);

  var count = 0;

  var states = {
    load: State.create()
  };

  states.load.on('enter', (passedStateManager) => {
    if (count === 0) {
      assert.ok(passedStateManager.get('isFirst'), "passes first state manager when created");
    } else {
      assert.ok(passedStateManager.get('isSecond'), "passes second state manager when created");
    }

    count++;
  });

  StateManager.create({
    initialState: 'load',
    isFirst: true,

    states: states
  });

  StateManager.create({
    initialState: 'load',
    isSecond: true,

    states: states
  });
});

test("a state finds properties that are states and copies them to the states hash", (assert) => {
  var state1 = State.create();
  var state2 = State.create();

  var superClass = State.extend({
    state1: state1
  });

  var stateInstance = superClass.create({
    state2: state2
  });

  var states = stateInstance.get('states');

  assert.deepEqual(states, { state1: state1, state2: state2 }, "states should be retrieved from both the instance and its class");
});

test("a state finds properties that are state classes and instantiates them", (assert) => {
  var state1 = State.extend({
    isState1: true
  });
  var state2 = State.extend({
    isState2: true
  });

  var superClass = State.extend({
    state1: state1
  });

  var stateInstance = superClass.create({
    state2: state2
  });

  var states = stateInstance.get('states');

  assert.equal(states.state1.get('isState1'), true, "instantiated first state");
  assert.equal(states.state2.get('isState2'), true, "instantiated second state");
});

test("states set up proper names on their children", (assert) => {
  var manager = StateManager.create({
    states: {
      first: State.extend({
        insideFirst: State.extend({

        })
      })
    }
  });

  manager.transitionTo('first');
  assert.equal(manager.get('currentState.path'), 'first');

  manager.transitionTo('first.insideFirst');
  assert.equal(manager.get('currentState.path'), 'first.insideFirst');
});

test("states with child instances set up proper names on their children", (assert) => {
  var manager = StateManager.create({
    states: {
      first: State.create({
        insideFirst: State.create({

        })
      })
    }
  });

  manager.transitionTo('first');
  assert.equal(manager.get('currentState.path'), 'first');

  manager.transitionTo('first.insideFirst');
  assert.equal(manager.get('currentState.path'), 'first.insideFirst');
});

test("the isLeaf property is false when a state has child states", (assert) => {
  var manager = StateManager.create({
    states: {
      first: State.create({
        insideFirst: State.create(),
        otherInsideFirst: State.create({
          definitelyInside: State.create()
        })
      })
    }
  });

  var first = manager.get('states.first');
  var insideFirst = first.get('states.insideFirst');
  var otherInsideFirst = first.get('states.otherInsideFirst');
  var definitelyInside = otherInsideFirst.get('states.definitelyInside');

  assert.equal(first.get('isLeaf'), false);
  assert.equal(insideFirst.get('isLeaf'), true);
  assert.equal(otherInsideFirst.get('isLeaf'), false);
  assert.equal(definitelyInside.get('isLeaf'), true);
});

test("propagates its container to its child states", (assert) => {
  var container = { lookup() {} },
      manager = StateManager.create({
        container: container,
        states: {
          first: State.extend({
            insideFirst: State.extend()
          }),
          second: State.create()
        }
      });

  var first = manager.get('states.first'),
      insideFirst = first.get('states.insideFirst'),
      second = manager.get('states.second');

  assert.equal(first.container, container, 'container should be given to a `create`ed child state');
  assert.equal(insideFirst.container, container, 'container should be given to a nested child state');
  assert.equal(second.container, container, 'container should be given to a `extend`ed child state after creation');
});

function Event(contexts) {
  if (contexts) {
    this.contexts = contexts;
  }
}

var _$;

module("State.transitionTo", {
  setup() {
    _$ = Ember.$;
    Ember.$ = { Event };
  },
  teardown() {
    Ember.$ = _$;
  }
});

test("sets the transition target", (assert) => {
  var receivedTarget,
      receivedContext,
      stateManager,
      transitionFunction;

  stateManager = {
    transitionTo(target, context) {
      receivedTarget = target;
      receivedContext = context;
    }
  };

  transitionFunction = State.transitionTo('targetState');

  transitionFunction(stateManager, new Event());

  assert.equal(receivedTarget, 'targetState');
  assert.ok(!receivedContext, "does not pass a context when given an event without context");
});

test("passes no context arguments when there are no contexts", (assert) => {
  var contextArgsCount,
      stateManager,
      transitionFunction,
      event;

  event = new Event([]);

  stateManager = {
    transitionTo() {
      contextArgsCount = [].slice.call(arguments, 1).length;
    }
  };

  transitionFunction = State.transitionTo('targetState');

  transitionFunction(stateManager, event);

  assert.equal( contextArgsCount, 0);
});

test("passes through a single context", (assert) => {
  var receivedContext,
      stateManager,
      transitionFunction,
      event;

  event = new Event([{ value: 'context value' }]);

  stateManager = {
    transitionTo(target, context) {
      receivedContext = context;
    }
  };

  transitionFunction = State.transitionTo('targetState');

  transitionFunction(stateManager, event);

  assert.equal( receivedContext, event.contexts[0]);
});

test("passes through multiple contexts as additional arguments", (assert) => {
  var receivedContexts,
      stateManager,
      transitionFunction,
      event;

  event = new Event([ { value: 'context1' }, { value: 'context2' } ]);

  stateManager = {
    transitionTo() {
      receivedContexts = [].slice.call(arguments, 1);
    }
  };

  transitionFunction = State.transitionTo('targetState');

  transitionFunction(stateManager, event);

  assert.deepEqual( receivedContexts, event.contexts);
});

test("does not mutate the event contexts value", (assert) => {
  var receivedContexts,
      stateManager,
      transitionFunction,
      originalContext,
      event;

  originalContext = [ { value: 'context1' }, { value: 'context2' } ];

  event = new Event(originalContext.slice());

  stateManager = {
    transitionTo() {
      receivedContexts = [].slice.call(arguments, 1);
    }
  };

  transitionFunction = State.transitionTo('targetState');

  transitionFunction(stateManager, event);

  assert.deepEqual(event.contexts, originalContext);
});

test("passes no context arguments when called with no context or event", (assert) => {
  var receivedContexts,
      stateManager,
      transitionFunction;

  stateManager = {
    transitionTo() {
      receivedContexts = [].slice.call(arguments, 1);
    }
  };

  transitionFunction = State.transitionTo('targetState');

  transitionFunction(stateManager);

  assert.equal( receivedContexts.length, 0, "transitionTo receives no context");
});

test("handles contexts without an event", (assert) => {
  var receivedContexts,
      stateManager,
      transitionFunction,
      context1,
      context2;

  context1 = { value: 'context1', contexts: 'I am not an event'};
  context2 = { value: 'context2', contexts: ''};

  stateManager = {
    transitionTo() {
      receivedContexts = [].slice.call(arguments, 1);
    }
  };

  transitionFunction = State.transitionTo('targetState');

  transitionFunction(stateManager, context1, context2);

  assert.equal( receivedContexts[0], context1, "the first context is passed through" );
  assert.equal( receivedContexts[1], context2, "the second context is passed through" );
});
