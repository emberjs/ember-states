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

module("State.transitionTo");

test("sets the transition target", (assert) => {
  let receivedTarget;
  let stateManager = {
    transitionTo(target) {
      receivedTarget = target;
    }
  };

  let transitionFunction = State.transitionTo('targetState');

  transitionFunction(stateManager);

  assert.equal(receivedTarget, 'targetState');
});
