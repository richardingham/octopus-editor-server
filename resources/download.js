
$(function ($) {
  var checkboxes = $('<div>').hide().appendTo($('form'));
  $('#variables-list tbody input[type=checkbox]').appendTo(checkboxes);

  $('[data-toggle="tooltip"]').tooltip();

  $('#variables-list').DataTable({
    order: [[1, 'asc']],
    paging: false,
    columns: [
      { visible: false, orderable: false },
      null,
      null,
      null
    ]
  });

  $('<button class="btn btn-default">Clear</button>')
    .appendTo('#variables-list_filter')
    .on('click', function () {
      $('#variables-list_filter input').val('');
      return false;
    });
  $('<button class="btn btn-default">Select filtered</button>')
    .appendTo('#variables-list_filter')
    .on('click', generateToggleAllStatesFunction(true));
  $('<button class="btn btn-default">Deselect filtered</button>')
    .appendTo('#variables-list_filter')
    .on('click', generateToggleAllStatesFunction(false));

  $('#variables-list tbody').on('click', 'tr', function () {
    toggleSelectedState(this);
    setSubmitButtonState();
  });

  function generateToggleAllStatesFunction (state) {
    return function () {
      $('#variables-list tbody tr').each(function () {
        toggleSelectedState(this, state);
      });
      setSubmitButtonState();
      return false;
    };
  }

  function toggleSelectedState (tr, state) {
    $(tr).toggleClass('active', state);
    $('input[value="' + $(tr).data('key') + '"]', checkboxes)
      .attr('checked', $(tr).is('.active'));
  }

  // Disable submit button initially.
  function setSubmitButtonState () {
    var selectedVars = $('input[checked]', checkboxes).length;
    var button = $('form .buttons button[type="submit"]');

    button.attr('disabled', selectedVars === 0);

    if (selectedVars === 0) {
      button.parent('.tooltip-wrapper').tooltip({
        title: 'Select some data variables to continue',
        placement: 'right'
      });
    } else {
      button.parent('.tooltip-wrapper').tooltip('destroy');
    }
  }

  setSubmitButtonState();
});
