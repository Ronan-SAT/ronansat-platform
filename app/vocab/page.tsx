"use client";

import InitialTabBootReady from "@/components/InitialTabBootReady";
import type { VocabCard } from "@/components/vocab/VocabBoardProvider";
import { FlashCardOverlay } from "@/components/vocab/FlashCardOverlay";
import { VocabAddColumnPanel } from "@/components/vocab/VocabAddColumnPanel";
import { VocabCardEditorDialog } from "@/components/vocab/VocabCardEditorDialog";
import { VocabColumn } from "@/components/vocab/VocabColumn";
import { VocabInboxColumn } from "@/components/vocab/VocabInboxColumn";
import { VocabPageHeader } from "@/components/vocab/VocabPageHeader";
import { useVocabPageController } from "@/components/vocab/useVocabPageController";

function isVocabCard(card: VocabCard | undefined): card is VocabCard {
  return Boolean(card);
}

export default function VocabPage() {
  const {
    board,
    hydrated,
    inboxCards,
    draggingColumnId,
    dropIndicator,
    isAddingColumn,
    newColumnTitle,
    draftByBucket,
    openComposerByBucket,
    editingCardId,
    editingCardDefinition,
    editingColumnId,
    editingColumnTitle,
    openMenuColumnId,
    flashCardModal,
    flashCardIndex,
    isFlashCardAnswerVisible,
    activeFlashCard,
    activeFlashCardContent,
    dictionaryLookupByCardId,
    menuRef,
    boardScrollRef,
    setDraggingCardId,
    setEditingCardDefinition,
    setEditingColumnTitle,
    setIsAddingColumn,
    setNewColumnTitle,
    updateBucketDraft,
    openBucketComposer,
    resetBucketComposer,
    handleCreateColumn,
    cancelCreateColumn,
    handleAddCard,
    startEditCard,
    saveCardEdit,
    cancelCardEdit,
    fetchDefinitionForCard,
    startEditColumn,
    saveColumnEdit,
    cancelColumnEdit,
    toggleColumnMenu,
    openCollectionPractice,
    showPreviousFlashCard,
    showNextFlashCard,
    setIsFlashCardAnswerVisible,
    setFlashCardModal,
    handleChangeColumnColor,
    handleRemoveColumn,
    handleDropCardToBucket,
    handleColumnDragStart,
    clearColumnDragState,
    handleColumnDragOver,
    handleColumnDrop,
    handleBoardDragOver,
    handleBoardDrop,
    removeCard,
  } = useVocabPageController();
  const activeEditingCard = editingCardId ? board.cards[editingCardId] ?? null : null;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-paper-bg bg-dot-pattern px-4 py-4 sm:px-5 lg:h-screen lg:overflow-hidden lg:px-6">
      <InitialTabBootReady />
      <div className="mx-auto max-w-[1640px] lg:flex lg:h-full lg:flex-col">
        <VocabPageHeader />

        <section className="workbook-panel p-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-fg/70">Collections</div>
            </div>
            <div className="workbook-sticker bg-accent-1 text-ink-fg">{board.columns.length} lists</div>
          </div>

          <div
            ref={boardScrollRef}
            className="flex gap-4 overflow-x-auto pb-2 lg:min-h-0 lg:flex-1 lg:items-stretch"
            onDragOver={handleBoardDragOver}
            onDrop={handleBoardDrop}
          >
            <VocabInboxColumn
              hydrated={hydrated}
              cards={inboxCards}
              isComposerOpen={!!openComposerByBucket.inbox}
              draftValue={draftByBucket.inbox ?? ""}
              editingCardId={editingCardId}
              dictionaryLookupByCardId={dictionaryLookupByCardId}
              onDraftChange={(value) => updateBucketDraft("inbox", value)}
              onOpenComposer={() => openBucketComposer("inbox")}
              onCloseComposer={() => resetBucketComposer("inbox")}
              onAddCard={() => handleAddCard("inbox")}
              onEditCard={startEditCard}
              onFetchDefinition={fetchDefinitionForCard}
              onRemoveCard={removeCard}
              onCardDragStart={setDraggingCardId}
              onDropCard={() => handleDropCardToBucket("inbox")}
              onPractice={() => openCollectionPractice("inbox")}
            />

            {board.columns.map((column, columnIndex) => {
              const columnCards = column.cardIds.map((cardId) => board.cards[cardId]).filter(isVocabCard);
              const showBefore =
                dropIndicator?.columnId === column.id &&
                dropIndicator.position === "before" &&
                draggingColumnId !== column.id;
              const showAfter =
                dropIndicator?.columnId === column.id &&
                dropIndicator.position === "after" &&
                draggingColumnId !== column.id;

              return (
                <VocabColumn
                  key={column.id}
                  column={column}
                  columnIndex={columnIndex}
                  cards={columnCards}
                  showBefore={showBefore}
                  showAfter={showAfter}
                  isDragging={draggingColumnId === column.id}
                  isComposerOpen={!!openComposerByBucket[column.id]}
                  draftValue={draftByBucket[column.id] ?? ""}
                  editingCardId={editingCardId}
                  editingColumnId={editingColumnId}
                  editingColumnTitle={editingColumnTitle}
                  openMenuColumnId={openMenuColumnId}
                  dictionaryLookupByCardId={dictionaryLookupByCardId}
                  menuRef={menuRef}
                  onDraftChange={(value) => updateBucketDraft(column.id, value)}
                  onOpenComposer={() => openBucketComposer(column.id)}
                  onCloseComposer={() => resetBucketComposer(column.id)}
                  onAddCard={() => handleAddCard(column.id)}
                  onEditCard={startEditCard}
                  onFetchDefinition={fetchDefinitionForCard}
                  onRemoveCard={removeCard}
                  onCardDragStart={setDraggingCardId}
                  onPractice={() => openCollectionPractice(column.id)}
                  onColumnTitleChange={setEditingColumnTitle}
                  onSaveColumnEdit={saveColumnEdit}
                  onCancelColumnEdit={cancelColumnEdit}
                  onStartColumnEdit={() => startEditColumn(column)}
                  onToggleMenu={toggleColumnMenu}
                  onUpdateColumnColor={handleChangeColumnColor}
                  onRemoveColumn={handleRemoveColumn}
                  onDropCard={() => handleDropCardToBucket(column.id)}
                  onHeaderDragStart={handleColumnDragStart}
                  onHeaderDragEnd={clearColumnDragState}
                  onHeaderDragOver={handleColumnDragOver}
                  onHeaderDrop={(event, columnId) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleColumnDrop(columnId);
                  }}
                />
              );
            })}

            <VocabAddColumnPanel
              isAddingColumn={isAddingColumn}
              newColumnTitle={newColumnTitle}
              onNewColumnTitleChange={setNewColumnTitle}
              onCreateColumn={handleCreateColumn}
              onCancel={cancelCreateColumn}
              onStart={() => setIsAddingColumn(true)}
            />
          </div>
        </section>
      </div>

      <VocabCardEditorDialog
        card={activeEditingCard}
        editingDefinition={editingCardDefinition}
        dictionaryStatus={activeEditingCard ? dictionaryLookupByCardId[activeEditingCard.id] : undefined}
        onEditingDefinitionChange={setEditingCardDefinition}
        onFetchDefinition={() => {
          if (activeEditingCard) {
            void fetchDefinitionForCard(activeEditingCard);
          }
        }}
        onSave={saveCardEdit}
        onClose={cancelCardEdit}
      />

      {flashCardModal && activeFlashCard && activeFlashCardContent ? (
        <FlashCardOverlay
          title={flashCardModal.title}
          currentIndex={flashCardIndex}
          total={flashCardModal.cards.length}
          vocabulary={activeFlashCardContent.vocabulary}
          meaning={activeFlashCardContent.meaning}
          audioUrl={activeFlashCardContent.audioUrl}
          audioQueue={flashCardModal.cards.map((card) => ({ vocabulary: card.term, audioUrl: card.audioUrl }))}
          isAnswerVisible={isFlashCardAnswerVisible}
          onToggleAnswer={() => setIsFlashCardAnswerVisible((current) => !current)}
          onClose={() => setFlashCardModal(null)}
          onPrevious={showPreviousFlashCard}
          onNext={showNextFlashCard}
        />
      ) : null}
    </main>
  );
}
