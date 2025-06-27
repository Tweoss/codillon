use super::EditorBuffer;
use super::textbox::Textbox;
use leptos::prelude::*;

/// This function creates a list of textboxs with a push button and a pop button.
/// Initially, it will have 0 textboxes.
#[component]
pub fn Boxlist() -> impl IntoView {
    let (editor_buffer, set_editor_buffer) = signal(EditorBuffer::default());

    let execute = move || {
        editor_buffer.get().execute();
    };

    // Will be triggered by the button, see below
    let push_line = move |_| {
        set_editor_buffer.write().push_line();
        execute();
    };
    // TODO: insert line at correct position on enter
    let insert_line = move || {
        set_editor_buffer.write().push_line();
    };

    let pop_line = move |_| {
        set_editor_buffer.write().pop_line();
    };

    view! {
        <div>
            <button on:click=push_line>"Add Line"</button>
            <button on:click=pop_line>"Remove Line"</button>
            <pre><p>{move || editor_buffer.get().exec_result.0.get()}</p></pre>
            <ForEnumerate
                each=move || editor_buffer.get().lines
                key=|entry| entry.id
                children=move |index, entry| {
                    view! {
                        <br />
                        {index}
                        ": "
                        <Textbox text=entry.value on_input=execute on_enter=insert_line/>
                    }
                }
            />
        </div>
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_editor_buffer() {
        let mut editor_buffer = EditorBuffer::default();
        editor_buffer.push_line();
        editor_buffer.push_line();
        editor_buffer.push_line();
        editor_buffer.push_line();
        assert_eq!(editor_buffer.lines.len(), 4);
        editor_buffer.pop_line();
        editor_buffer.pop_line();
        assert_eq!(editor_buffer.lines.len(), 2);
        editor_buffer
            .lines
            .iter_mut()
            .next()
            .unwrap()
            .value
            .set(String::from("Hello"));
        editor_buffer
            .lines
            .iter_mut()
            .nth(1)
            .unwrap()
            .value
            .set(String::from("Leptos"));
        assert_eq!(editor_buffer.concat(), "Hello\nLeptos".to_string());
    }
}
